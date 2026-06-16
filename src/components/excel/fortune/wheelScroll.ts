import { useCallback, useEffect, useRef } from "react";
import type { WheelEvent as ReactWheelEvent } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wheelDelta(value: number, mode: number) {
  if (mode === 1) return value * 40;
  if (mode === 2) return value * 240;
  return value;
}

function emitScroll(el: HTMLElement) {
  el.dispatchEvent(new Event("scroll", { bubbles: true }));
}

function canScroll(el: HTMLElement, delta: number, axis: "x" | "y") {
  const current = axis === "y" ? el.scrollTop : el.scrollLeft;
  const max = axis === "y" ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
  if (max <= 0) return false;
  return delta > 0 ? current < max : current > 0;
}

type WheelLikeEvent = Pick<
  WheelEvent,
  "target" | "deltaX" | "deltaY" | "deltaMode" | "shiftKey" | "preventDefault" | "stopPropagation"
>;

function handleFortuneWheel(sheet: HTMLElement, event: WheelLikeEvent) {
  const target = event.target as Element | null;
  if (!target?.closest(".fortune-sheet-container, .luckysheet-scrollbars")) return false;

  const scrollbarY = sheet.querySelector<HTMLElement>(".luckysheet-scrollbar-y");
  const scrollbarX = sheet.querySelector<HTMLElement>(".luckysheet-scrollbar-x");
  const rawDeltaY = event.shiftKey && Math.abs(event.deltaX) < Math.abs(event.deltaY) ? 0 : wheelDelta(event.deltaY, event.deltaMode);
  const rawDeltaX = wheelDelta(event.shiftKey ? event.deltaY || event.deltaX : event.deltaX, event.deltaMode);
  let handled = false;

  if (scrollbarY && rawDeltaY !== 0 && canScroll(scrollbarY, rawDeltaY, "y")) {
    const maxTop = scrollbarY.scrollHeight - scrollbarY.clientHeight;
    scrollbarY.scrollTop = clamp(scrollbarY.scrollTop + rawDeltaY, 0, maxTop);
    emitScroll(scrollbarY);
    handled = true;
  }

  if (scrollbarX && rawDeltaX !== 0 && canScroll(scrollbarX, rawDeltaX, "x")) {
    const maxLeft = scrollbarX.scrollWidth - scrollbarX.clientWidth;
    scrollbarX.scrollLeft = clamp(scrollbarX.scrollLeft + rawDeltaX, 0, maxLeft);
    emitScroll(scrollbarX);
    handled = true;
  }

  if (!handled) return false;
  event.preventDefault();
  event.stopPropagation();
  return true;
}

export function handleFortuneWheelCapture(event: ReactWheelEvent<HTMLElement>) {
  handleFortuneWheel(event.currentTarget, event.nativeEvent);
}

export function useFortuneWheelScrollFix<T extends HTMLElement>() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((sheet: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!sheet) return;

    const listener = (event: WheelEvent) => {
      if (handleFortuneWheel(sheet, event)) {
        event.stopImmediatePropagation();
      }
    };
    sheet.addEventListener("wheel", listener, { capture: true, passive: false });
    cleanupRef.current = () => {
      sheet.removeEventListener("wheel", listener, { capture: true });
    };
  }, []);

  useEffect(() => () => cleanupRef.current?.(), []);

  return ref;
}
