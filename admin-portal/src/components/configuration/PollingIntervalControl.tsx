"use client";

interface PollingIntervalControlProps {
  value: number;
  onChange: (value: number) => void;
}

export default function PollingIntervalControl({ value, onChange }: PollingIntervalControlProps) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        Polling Interval
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        How often Pi 0 reads the TOF sensor and sends data to Pi 5
      </p>

      <div className="flex items-center gap-4">
        <input
          type="range"
          min={100}
          max={5000}
          step={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-blue-500"
        />
        <div
          className="px-3 py-1.5 rounded-lg text-sm font-mono font-medium min-w-[80px] text-center"
          style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)" }}
        >
          {value}ms
        </div>
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>100ms (fast)</span>
        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>5000ms (power saving)</span>
      </div>
    </div>
  );
}
