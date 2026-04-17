"use client";

interface SensorHealthRingProps {
  online: number;
  offline: number;
}

export default function SensorHealthRing({ online, offline }: SensorHealthRingProps) {
  const total = online + offline;
  const pct = total > 0 ? online / total : 1;

  const size = 140;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  const color = pct > 0.95 ? "#33BF4D" : pct > 0.85 ? "#F59E0B" : "#D92626";

  return (
    <div
      className="rounded-xl p-5 border flex items-center gap-5"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--surface)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tabular-nums" style={{ color }}>
            {Math.round(pct * 100)}%
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            healthy
          </span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Sensor Fleet Health
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span style={{ color: "var(--text-secondary)" }}>Online</span>
          <span className="ml-auto tabular-nums font-semibold" style={{ color: "var(--text-primary)" }}>
            {online}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#D92626" }} />
          <span style={{ color: "var(--text-secondary)" }}>Offline</span>
          <span className="ml-auto tabular-nums font-semibold" style={{ color: "var(--text-primary)" }}>
            {offline}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs pt-1 border-t" style={{ borderColor: "var(--border)" }}>
          <span style={{ color: "var(--text-secondary)" }}>Total deployed</span>
          <span className="ml-auto tabular-nums font-semibold" style={{ color: "var(--text-primary)" }}>
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}
