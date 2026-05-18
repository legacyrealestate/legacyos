"use client";

import { useEffect } from "react";
import { realtime } from "@/lib/realtime";

export default function RealtimeProvider() {

  useEffect(() => {

    const ticketsChannel =
      realtime
        .channel("tickets-live")

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "maintenance_tickets",
          },
          (payload) => {

            console.log(
              "Realtime Ticket:",
              payload
            );

            location.reload();

          }
        )

        .subscribe();

    const notificationsChannel =
      realtime
        .channel("notifications-live")

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "notifications",
          },
          (payload) => {

            console.log(
              "Realtime Notification:",
              payload
            );

            location.reload();

          }
        )

        .subscribe();

    return () => {

      realtime.removeChannel(
        ticketsChannel
      );

      realtime.removeChannel(
        notificationsChannel
      );

    };

  }, []);

  return null;
}