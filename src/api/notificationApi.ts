import { baseApi } from "./base/baseApi";
import type {
  NotificationSearchRequest,
  NotificationSearchResponse,
  NotificationUnreadCountResponse,
} from "../types/notification";

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotificationUnreadCount: build.query<NotificationUnreadCountResponse, void>({
      query: () => ({ url: "notifications/unread-count" }),
      providesTags: ["Notification"],
    }),

    searchNotifications: build.mutation<NotificationSearchResponse, NotificationSearchRequest | void>({
      query: (body) => ({
        url: "notifications/search",
        method: "POST",
        data: body ?? { pageSize: 20 },
      }),
    }),

    markNotificationRead: build.mutation<void, string>({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: "POST",
      }),
      invalidatesTags: ["Notification"],
    }),

    markNotificationsRead: build.mutation<void, string[]>({
      query: (ids) => ({
        url: "notifications/read",
        method: "POST",
        data: { ids },
      }),
      invalidatesTags: ["Notification"],
    }),

    markAllNotificationsRead: build.mutation<void, void>({
      query: () => ({
        url: "notifications/read-all",
        method: "POST",
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetNotificationUnreadCountQuery,
  useSearchNotificationsMutation,
  useMarkNotificationReadMutation,
  useMarkNotificationsReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationApi;
