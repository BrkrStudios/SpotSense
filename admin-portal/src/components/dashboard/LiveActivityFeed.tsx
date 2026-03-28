"use client";

import { ActivityEvent, SpotStatus } from "@/lib/types";
import { COLORS } from "@/lib/constants";
import { relativeTime } from "@/lib/utils";

interface LiveActivityFeedProps {
  events: ActivityEvent[];
}

export default function LiveActivityFeed({ events }: LiveActivityFeedProps) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Live Activity
          </h3>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Last 30 events
        </span>
      </div>

      {/* Event list */}
      <div className="max-h-[340px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Waiting for activity...
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {events.map((event, i) => {
              const isNowOccupied = event.newStatus === SpotStatus.Occupied;
              const dotColor = isNowOccupied ? COLORS.occupied : COLORS.available;
              const label = isNowOccupied ? "Occupied" : "Available";

              return (
                <div
                  key={event.id}
                  className="px-5 py-2.5 flex items-center gap-3 transition-opacity duration-300"
                  style={{
                    opacity: 1,
                    animation: i === 0 ? "fadeSlideIn 0.3s ease-out" : undefined,
                  }}
                >
                  {/* Status dot */}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />

                  {/* Message */}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                      Spot {event.spotId}
                    </span>
                    <span className="text-xs mx-1.5" style={{ color: "var(--text-secondary)" }}>
                      &rarr;
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: dotColor }}
                    >
                      {label}
                    </span>
                    {event.isHandicap && (
                      <span
                        className="ml-1.5 text-[10px] px-1 py-0.5 rounded"
                        style={{ backgroundColor: COLORS.handicap + "22", color: COLORS.handicap }}
                      >
                        HC
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span
                    className="text-[10px] shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inline animation keyframes */}
      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
