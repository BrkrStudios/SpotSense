"use client";

import Link from "next/link";
import { SensorReading, ParkingSpot } from "@/lib/types";
import { spotColor, relativeTime } from "@/lib/utils";
import SensorStatusBadge from "./SensorStatusBadge";

interface SensorCardProps {
  spotId: number;
  spot: ParkingSpot;
  sensor: SensorReading;
}

export default function SensorCard({ spotId, spot, sensor }: SensorCardProps) {
  const color = spotColor(spot);

  return (
    <Link href={`/sensors/${spotId}`}>
      <div
        className="rounded-xl border p-4 hover:border-white/20 transition-colors cursor-pointer"
        style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Spot {spotId}
            </span>
          </div>
          <SensorStatusBadge
            online={sensor.sensorOnline}
            batteryPercent={sensor.batteryPercent}
          />
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Distance</span>
            <span className="tabular-nums" style={{ color: "var(--text-primary)" }}>
              {sensor.distanceMm}mm
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Battery</span>
            <span className="tabular-nums" style={{ color: "var(--text-primary)" }}>
              {sensor.batteryPercent ?? "—"}%
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Updated</span>
            <span style={{ color: "var(--text-primary)" }}>
              {relativeTime(sensor.lastUpdated)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
