"use client";

interface StatCardProps {
  label: string;
  value: number;
  total?: number;
  color: string;
  icon: React.ReactNode;
}

export default function StatCard({ label, value, total, color, icon }: StatCardProps) {
  const percentage = total ? Math.round((value / total) * 100) : null;

  return (
    <div
      className="rounded-xl p-5 border"
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
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {value}
        </span>
        {total && (
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            / {total}
          </span>
        )}
      </div>
      {percentage !== null && (
        <div className="mt-3">
          <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--surface)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${percentage}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-xs mt-1 block" style={{ color: "var(--text-secondary)" }}>
            {percentage}%
          </span>
        </div>
      )}
    </div>
  );
}
