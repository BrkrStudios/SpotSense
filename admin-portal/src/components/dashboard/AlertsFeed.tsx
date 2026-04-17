"use client";

import { Alert } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import Link from "next/link";

interface AlertsFeedProps {
  alerts: Alert[];
}

const severityConfig = {
  critical: { color: "#D92626", bg: "#D9262610", label: "Critical" },
  warning: { color: "#F59E0B", bg: "#F59E0B10", label: "Warning" },
  info: { color: "#3366E6", bg: "#3366E610", label: "Info" },
};

export default function AlertsFeed({ alerts }: AlertsFeedProps) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Recent Alerts
        </h3>
        <Link href="/alerts" className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
          View All &rarr;
        </Link>
      </div>
      <div className="max-h-[340px] overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
        {alerts.filter((a) => !a.resolved).slice(0, 10).map((alert) => {
          const cfg = severityConfig[alert.severity];
          return (
            <div
              key={alert.id}
              className="px-5 py-3 flex items-start gap-3"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0"
                style={{ backgroundColor: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                  {alert.message}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {relativeTime(alert.timestamp)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
