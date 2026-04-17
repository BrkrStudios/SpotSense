"use client";

import Link from "next/link";
import { SensorReading, ParkingSpot } from "@/lib/types";
import { spotColor, relativeTime } from "@/lib/utils";

interface SensorListRowProps {
  spotId: number;
  spot: ParkingSpot;
  sensor: SensorReading;
}

export default function SensorListRow({ spotId, spot, sensor }: SensorListRowProps) {
  const color = spotColor(spot);
  const battery = sensor.batteryPercent;
  const batteryColor =
    battery === null ? "var(--text-secondary)" : battery < 20 ? "#D92626" : battery < 40 ? "#F59E0B" : "#33BF4D";

  return (
    <Link href={`/sensors/${spotId}`}>
      <div
        className="grid grid-cols-[10px_80px_90px_120px_1fr_110px_24px] items-center gap-3 px-4 py-2.5 border-b transition-colors hover:opacity-90"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="w-2.5 h-2.5 rounded-sm shrink-0"
          style={{ backgroundColor: color }}
        />

        <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
          Spot {spotId}
        </span>

        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit"
          style={{
            backgroundColor: sensor.sensorOnline ? "#33BF4D22" : "#D9262622",
            color: sensor.sensorOnline ? "#33BF4D" : "#D92626",
          }}
        >
          {sensor.sensorOnline ? "Online" : "Offline"}
        </span>

        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-1.5 rounded-full overflow-hidden shrink-0"
            style={{ width: 56, backgroundColor: "var(--surface)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${battery ?? 0}%`,
                backgroundColor: batteryColor,
              }}
            />
          </div>
          <span className="text-xs tabular-nums w-10" style={{ color: batteryColor }}>
            {battery ?? "—"}%
          </span>
        </div>

        <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
          {sensor.distanceMm}mm
        </span>

        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {relativeTime(sensor.lastUpdated)}
        </span>

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
          <path d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
