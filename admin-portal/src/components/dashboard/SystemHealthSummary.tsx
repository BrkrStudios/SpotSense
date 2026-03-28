"use client";

import { ParkingLotData } from "@/lib/types";

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
