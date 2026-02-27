"use client";

interface CameraThresholdControlProps {
  value: number;
  onChange: (value: number) => void;
}

export default function CameraThresholdControl({ value, onChange }: CameraThresholdControlProps) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        Camera Trigger Threshold
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Number of consecutive TOF detections before ArduCamera captures a snapshot.
        Higher values save power but increase detection latency.
      </p>

      <div className="flex items-center gap-4">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold border transition-colors hover:bg-white/10"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          −
        </button>

        <div
          className="px-4 py-2 rounded-lg text-xl font-bold tabular-nums min-w-[60px] text-center"
          style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)" }}
        >
          {value}
        </div>

        <button
          onClick={() => onChange(Math.min(10, value + 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold border transition-colors hover:bg-white/10"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          +
        </button>

        <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>
          consecutive detections
        </span>
      </div>
    </div>
  );
}
