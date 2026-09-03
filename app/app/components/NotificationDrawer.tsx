"use client";

import { useState } from "react";

export default function NotificationDrawer({
  open,
  onClose,
  notifications,
  onAcknowledged,
}: {
  open: boolean;
  onClose: () => void;
  onAcknowledged?: () => void;
  notifications?: Array<{
    id?: string;
    title?: string;
    description?: string;
    type?: string;
    acknowledged_at?: string | null;
  }>;
}) {
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());

  async function acknowledge(notificationId?: string) {
    if (!notificationId) return;
    setAcknowledgingId(notificationId);

    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });

    if (res.ok) {
      setAcknowledgedIds((current) => new Set([...current, notificationId]));
      onAcknowledged?.();
    }
    setAcknowledgingId(null);
  }

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[420px] bg-white border-l border-black/[0.06] z-[100] transition-all duration-300 ease-out ${
        open
          ? "translate-x-0"
          : "translate-x-full"
      }`}
    >

      <div className="p-8">

        <div className="flex items-center justify-between">

          <div>

            <p className="uppercase tracking-[0.25em] text-zinc-400 text-[10px]">
              Live Infrastructure
            </p>

            <h2 className="text-[36px] font-semibold tracking-tight mt-4">
              Notifications
            </h2>

          </div>

          <button
            onClick={onClose}
            className="h-[42px] w-[42px] rounded-full border border-black/[0.06]"
          >
            ✕
          </button>

        </div>

        <div className="space-y-4 mt-8">

          {notifications?.map((notification, index) => {
            const acknowledged =
              Boolean(notification.acknowledged_at) ||
              (notification.id ? acknowledgedIds.has(notification.id) : false);

            return (

              <div
                key={notification.id || index}
                className="rounded-[28px] border border-black/[0.06] bg-[#fafafa] p-6 hover:scale-[1.02] transition-all duration-300 ease-out"
              >

                <div className="flex items-center justify-between gap-4">

                  <h3 className="text-[15px] font-medium">
                    {
                      notification.title
                    }
                  </h3>

                  <div className="h-[28px] px-3 rounded-full bg-black text-white text-[10px] flex items-center">
                    {acknowledged ? "ACK" : notification.type === "emergency" ? "ACTION" : "LIVE"}
                  </div>

                </div>

                <p className="text-zinc-500 text-[13px] leading-relaxed mt-4">
                  {
                    notification.description
                  }
                </p>

                {notification.type === "emergency" && !acknowledged && (
                  <button
                    onClick={() => acknowledge(notification.id)}
                    disabled={acknowledgingId === notification.id}
                    className="mt-5 h-[40px] px-4 rounded-2xl bg-black text-white text-[12px] disabled:opacity-50"
                  >
                    {acknowledgingId === notification.id ? "Acknowledging..." : "Acknowledge"}
                  </button>
                )}

              </div>

            );
          })}

        </div>

      </div>

    </div>
  );
}
