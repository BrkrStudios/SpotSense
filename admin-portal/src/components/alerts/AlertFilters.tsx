"use client";

import { Alert } from "@/lib/types";

type Severity = "all" | Alert["severity"];
type AlertType = "all" | Alert["type"];

interface AlertFiltersProps {
  severity: Severity;
  onSeverityChange: (s: Severity) => void;
  type: AlertType;
  onTypeChange: (t: AlertType) => void;
  showResolved: boolean;
  onShowResolvedChange: (v: boolean) => void;
  counts: { total: number; critical: number; warning: number; info: number; resolved: number };
}

const severityOptions: { value: Severity; label: string; color: string }[] = [
  { value: "all", label: "All", color: "var(--text-secondary)" },
  { value: "critical", label: "Critical", color: "#D92626" },
  { value: "warning", label: "Warning", color: "#F59E0B" },
  { value: "info", label: "Info", color: "#3B82F6" },
];

const typeOptions: { value: AlertType; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "sensor_offline", label: "Sensor Offline" },
  { value: "battery_low", label: "Battery Low" },
  { value: "connection_lost", label: "Connection Lost" },
  { value: "occupancy_threshold", label: "Occupancy" },
  { value: "system", label: "System" },
];

export default function AlertFilters({
  severity,
  onSeverityChange,
  type,
  onTypeChange,
  showResolved,
  onShowResolvedChange,
  counts,
}: AlertFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Severity pills */}
      <div className="flex gap-1.5">
        {severityOptions.map((opt) => {
          const isActive = severity === opt.value;
          const count =
            opt.value === "all"
              ? counts.total
              : counts[opt.value as keyof typeof counts] ?? 0;

          const bg =
            opt.value === "all"
              ? isActive
                ? "var(--surface)"
                : "transparent"
              : isActive
                ? opt.color + "22"
                : "transparent";
          return (
            <button
              key={opt.value}
              onClick={() => onSeverityChange(opt.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: bg,
                color: isActive ? opt.color : "var(--text-secondary)",
                border: `1px solid ${isActive && opt.value !== "all" ? opt.color + "66" : isActive ? "var(--border)" : "transparent"}`,
                boxShadow: isActive && opt.value !== "all" ? `0 0 0 2px ${opt.color}22` : "none",
              }}
            >
              {opt.label}
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: isActive ? opt.color + "33" : "var(--surface)",
                  color: isActive ? opt.color : "var(--text-secondary)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Type filter */}
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value as AlertType)}
        className="text-xs px-3 py-1.5 rounded-lg border appearance-none cursor-pointer"
        style={{
          backgroundColor: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      >
        {typeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Show resolved toggle */}
      <button
        onClick={() => onShowResolvedChange(!showResolved)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
        style={{
          backgroundColor: showResolved ? "var(--surface)" : "transparent",
          color: "var(--text-secondary)",
          border: showResolved ? "1px solid var(--border)" : "1px solid transparent",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 13l4 4L19 7" />
        </svg>
        Resolved ({counts.resolved})
      </button>
    </div>
  );
}
