"use client";

import { NotificationBell } from "./NotificationBell";

/**
 * Fixed top-right notification bell rendered in the root layout
 * so it appears on every page regardless of which header / shell is used.
 */
export function NotificationWidget() {
  return (
    <div
      className="fixed z-40 flex items-center"
      style={{ top: 11, right: 20 }}
    >
      <NotificationBell />
    </div>
  );
}
