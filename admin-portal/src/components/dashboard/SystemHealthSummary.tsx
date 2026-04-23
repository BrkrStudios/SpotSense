"use client";

import { ParkingLotData } from "@/lib/types";
import { useTemperature } from "@/hooks/useTemperature";

interface SystemHealthProps {
  data: ParkingLotData;
  sensorsOnline: number;
  sensorsOffline: number;
}

const statusColors = {
  online: "#33BF4D",
  offline: "#D92626",
  degraded: "#F59E0B",
};

export default function SystemHealthSummary({
  data,
  sensorsOnline,
  sensorsOffline,
}: SystemHealthProps) {
  const climate = useTemperature();

  return (
    <div
      className="rounded-xl border"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          System Health
        </h3>
      </div>
      <div className="p-5 space-y-4">
        <DeviceRow
          name="Pi 0 — Edge Unit"
          status={data.piZeroStatus}
          detail="Runs TOF polling, triggers camera"
        />
        <DeviceRow
          name="Railway — Backend API"
          status={data.backendStatus}
          detail="FastAPI server, reads from Firebase"
        />
        <div
          className="pt-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Sensors Online
            </span>
            <span className="text-sm font-medium" style={{ color: "#33BF4D" }}>
              {sensorsOnline}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Sensors Offline
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: sensorsOffline > 0 ? "#D92626" : "var(--text-secondary)" }}
            >
              {sensorsOffline}
            </span>
          </div>
        </div>

        {/* Climate — numbers reported by the parking sensor itself
            (heatsink / enclosure temp + HVAC draw of the Pi unit), NOT
            ambient air temperature. Clearly labeled so nobody confuses
            this with "current weather". */}
        <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
            Parking Sensor Climate
          </p>
          <p className="text-[10px] -mt-1 mb-3" style={{ color: "var(--text-secondary)", opacity: 0.75 }}>
            Sensor hardware readings — not outdoor temperature
          </p>
          <ClimateRow
            label="Avg Temp"
            value={climate.avgTemp == null ? "—" : `${climate.avgTemp.toFixed(1)}°F`}
            color={tempColor(climate.avgTemp)}
          />
          <ClimateRow
            label="Mode"
            value={
              climate.dominantMode == null
                ? "—"
                : climate.dominantMode === "heating"
                  ? "Heating"
                  : "Cooling"
            }
            color={modeColor(climate.dominantMode)}
          />
          <ClimateRow
            label="Avg Power"
            value={climate.avgPower == null ? "—" : `${climate.avgPower.toFixed(1)} W`}
            color="var(--accent)"
          />
        </div>

        <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Last Sync
            </span>
            <span className="text-xs" style={{ color: "var(--text-primary)" }}>
              Just now
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function tempColor(temp: number | null): string {
  if (temp == null) return "var(--text-secondary)";
  if (temp < 65) return "#3B82F6"; // too cold
  if (temp > 78) return "#D92626"; // too hot
  return "var(--accent)";
}

function modeColor(mode: "heating" | "cooling" | null): string {
  if (mode == null) return "var(--text-secondary)";
  return mode === "heating" ? "#F97316" : "#3B82F6";
}

function ClimateRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between mt-1.5 first:mt-0">
      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span
        className="text-sm font-medium tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

function DeviceRow({
  name,
  status,
  detail,
}: {
  name: string;
  status: "online" | "offline" | "degraded";
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: statusColors[status] }}
      />
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {name}
        </p>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {detail}
        </p>
      </div>
      <span
        className="text-xs capitalize font-medium"
        style={{ color: statusColors[status] }}
      >
        {status}
      </span>
    </div>
  );
}
