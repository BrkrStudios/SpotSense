"use client";

interface StatCardProps {
  label: string;
  value: number | string;
  total?: number;
  color: string;
  icon: React.ReactNode;
  subtitle?: string;
  progressPercent?: number;
}

export default function StatCard({ label, value, total, color, icon, subtitle, progressPercent }: StatCardProps) {
  const percentage = progressPercent ?? (typeof value === "number" && total ? Math.round((value / total) * 100) : null);

  return (
    <div
      className="rounded-xl p-4 md:p-5 border overflow-hidden"
      style={{
        backgroundColor: "var(--sidebar)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl md:text-3xl font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
        {typeof value === "number" && total && (
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            / {total}
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
          {subtitle}
        </span>
      )}
      {percentage !== null && (
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--surface)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, percentage)}%`, backgroundColor: color }}
            />
          </div>
          {!subtitle && (
            <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
              {percentage}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
