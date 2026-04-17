"use client";

interface CameraSavingsCardProps {
  /** Current camera threshold (N consecutive TOF detections before snapshot) */
  cameraThreshold: number;
  /** Detections per day estimate */
  detectionsPerDay?: number;
}

export default function CameraSavingsCard({
  cameraThreshold,
  detectionsPerDay = 1800,
}: CameraSavingsCardProps) {
  // Each camera fire is ~275 mA for ~0.4 s
  const perFireMas = 275 * 0.4; // mA·s
  const firesAtOne = detectionsPerDay; // baseline if threshold was 1
  const firesAtN = Math.ceil(detectionsPerDay / cameraThreshold);
  const saved = Math.max(0, firesAtOne - firesAtN);
  const savedMas = saved * perFireMas; // mA·s/day

  const pctSaved = firesAtOne > 0 ? saved / firesAtOne : 0;

  // Convert mAs → mAh (÷3600)
  const savedMah = savedMas / 3600;

  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Camera Power Savings
        </h3>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ backgroundColor: "var(--surface)", color: "var(--text-secondary)" }}
        >
          threshold = {cameraThreshold}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Snapshots skipped / day
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: "#33BF4D" }}>
            {saved.toLocaleString()}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            of {firesAtOne.toLocaleString()} baseline
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
            Current energy saved
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: "var(--accent)" }}>
            {savedMah.toFixed(1)}
            <span className="text-sm font-normal ml-1" style={{ color: "var(--text-secondary)" }}>
              mAh
            </span>
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            per sensor / day
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
            Savings vs. continuous snapshot
          </span>
          <span className="text-[10px] font-semibold" style={{ color: "#33BF4D" }}>
            {Math.round(pctSaved * 100)}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: "var(--surface)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, pctSaved * 100)}%`, backgroundColor: "#33BF4D" }}
          />
        </div>
      </div>
    </div>
  );
}
