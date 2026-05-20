import { getTokenFromStorage } from "../stores/authStorage";
import type { NotificationRealtimeMessage } from "../types/notification";

const RECORD_SEPARATOR = "\x1e";

type SignalRInvocation = {
  type?: number;
  target?: string;
  arguments?: unknown[];
};

type NegotiateResponse = {
  connectionId?: string;
  connectionToken?: string;
};

type NotificationRealtimeOptions = {
  onChanged: (message: NotificationRealtimeMessage) => void;
};

export type NotificationRealtimeConnection = {
  stop: () => void;
};

export const NOTIFICATION_REALTIME_EVENT = "tdtd:notification-realtime";

function getHubRootUrl() {
  const apiBase = import.meta.env.VITE_API_URL ?? "https://localhost:7232/api";
  return apiBase.replace(/\/api\/?$/i, "").replace(/\/$/, "");
}

function toWebSocketUrl(httpUrl: string) {
  if (httpUrl.startsWith("https://")) return `wss://${httpUrl.slice("https://".length)}`;
  if (httpUrl.startsWith("http://")) return `ws://${httpUrl.slice("http://".length)}`;
  if (httpUrl.startsWith("/")) {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${window.location.host}${httpUrl}`;
  }
  return httpUrl;
}

async function negotiate(hubUrl: string, token: string): Promise<NegotiateResponse> {
  const res = await fetch(`${hubUrl}/negotiate?negotiateVersion=1`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    credentials: "include",
  });

  if (!res.ok) throw new Error(`Notification hub negotiate failed: ${res.status}`);
  return (await res.json()) as NegotiateResponse;
}

function isRealtimeMessage(value: unknown): value is NotificationRealtimeMessage {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.notificationId === "string" && typeof obj.type === "string";
}

function publishRealtimeMessage(message: NotificationRealtimeMessage) {
  window.dispatchEvent(new CustomEvent<NotificationRealtimeMessage>(NOTIFICATION_REALTIME_EVENT, { detail: message }));
}

export function subscribeNotificationRealtime(
  onChanged: (message: NotificationRealtimeMessage) => void,
): () => void {
  const handler = (event: Event) => {
    const message = (event as CustomEvent<NotificationRealtimeMessage>).detail;
    if (isRealtimeMessage(message)) onChanged(message);
  };

  window.addEventListener(NOTIFICATION_REALTIME_EVENT, handler);
  return () => window.removeEventListener(NOTIFICATION_REALTIME_EVENT, handler);
}

export function connectNotificationRealtime(
  options: NotificationRealtimeOptions,
): NotificationRealtimeConnection {
  let socket: WebSocket | null = null;
  let stopped = false;
  let reconnectTimer: ReturnType<typeof window.setTimeout> | null = null;

  const hubUrl = `${getHubRootUrl()}/hubs/notifications`;

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, 5000);
  };

  const connect = async () => {
    const token = getTokenFromStorage();
    if (!token || stopped) return;

    try {
      const negotiation = await negotiate(hubUrl, token);
      const connectionToken = negotiation.connectionToken ?? negotiation.connectionId;
      if (!connectionToken) throw new Error("Notification hub negotiate missing connection token");

      const wsUrl =
        `${toWebSocketUrl(hubUrl)}?id=${encodeURIComponent(connectionToken)}` +
        `&access_token=${encodeURIComponent(token)}`;

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket?.send(`${JSON.stringify({ protocol: "json", version: 1 })}${RECORD_SEPARATOR}`);
      };

      socket.onmessage = (event) => {
        const payload = String(event.data ?? "");
        const frames = payload.split(RECORD_SEPARATOR).filter(Boolean);

        for (const frame of frames) {
          let message: SignalRInvocation | null = null;
          try {
            message = JSON.parse(frame) as SignalRInvocation;
          } catch {
            continue;
          }

          if (
            message.type === 1 &&
            message.target === "notificationChanged" &&
            isRealtimeMessage(message.arguments?.[0])
          ) {
            publishRealtimeMessage(message.arguments[0]);
            options.onChanged(message.arguments[0]);
          }
        }
      };

      socket.onclose = scheduleReconnect;
      socket.onerror = () => {
        socket?.close();
      };
    } catch {
      scheduleReconnect();
    }
  };

  void connect();

  return {
    stop: () => {
      stopped = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      socket?.close();
      socket = null;
    },
  };
}
