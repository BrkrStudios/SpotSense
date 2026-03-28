"use client";

import { Alert } from "@/lib/types";
import { relativeTime } from "@/lib/utils";
import Link from "next/link";

const severityConfig = {
  critical: { bg: "rgba(217, 38, 38, 0.15)", text: "#D92626", label: "Critical" },
  warning: { bg: "rgba(245, 158, 11, 0.15)", text: "#F59E0B", label: "Warning" },
  info: { bg: "rgba(59, 130, 246, 0.15)", text: "#3B82F6", label: "Info" },
};

const typeLabels: Record<string, string> = {
  sensor_offline: "Sensor Offline",
  battery_low: "Battery Low",
  connection_lost: "Connection Lost",
  occupancy_threshold: "Occupancy",
  system: "System",
};

interface AlertItemProps {
  alert: Alert;
  onResolve: (id: string) => void;
}

export default function AlertItem({ alert, onResolve }: AlertItemProps) {
  const sev = severityConfig[alert.severity];

  return (
    <div
      className="px-5 py-4 flex items-start gap-4"
      style={{ opacity: alert.resolved ? 0.5 : 1 }}
    >
      {/* Severity badge */}
      <span
        className="shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full mt-0.5"
        style={{ backgroundColor: sev.bg, color: sev.text }}
      >
        {sev.label}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>
          {alert.message}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {relativeTime(alert.timestamp)}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "var(--surface)", color: "var(--text-secondary)" }}
          >
            {typeLabels[alert.type] ?? alert.type}
          </span>
          {alert.spotId && (
            <Link
              href={`/sensors/${alert.spotId}`}
              className="text-xs hover:underline"
              style={{ color: "#3B82F6" }}
            >
              Spot {alert.spotId}
            </Link>
          )}
        </div>
      </div>

      {/* Resolve button / resolved state */}
      <div className="shrink-0">
        {alert.resolved ? (
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#33BF4D" strokeWidth="2">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[10px]" style={{ color: "#33BF4D" }}>
              Resolved
            </span>
          </div>
        ) : (
          <button
            onClick={() => onResolve(alert.id)}
            className="text-[11px] px-2.5 py-1 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--surface)", color: "var(--text-secondary)" }}
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
