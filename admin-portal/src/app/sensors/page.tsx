"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import SensorCard from "@/components/sensors/SensorCard";
import { getMockParkingData } from "@/lib/mock-data";
import { positionForSpotNumber } from "@/lib/utils";
import { TOTAL_NUMBERED_SPOTS } from "@/lib/constants";

type FilterMode = "all" | "online" | "offline" | "occupied" | "available";

export default function SensorsPage() {
  const data = getMockParkingData();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

  const spotIds = Array.from({ length: TOTAL_NUMBERED_SPOTS }, (_, i) => i + 1);

  const filtered = spotIds.filter((id) => {
    const sensor = data.sensors[id];
    if (!sensor) return false;

    // Search
    if (search && !String(id).includes(search)) return false;

    const pos = positionForSpotNumber(id);
    if (!pos) return false;
    const spot = data.grid[pos.row][pos.col];

    switch (filter) {
      case "online":
        return sensor.sensorOnline;
      case "offline":
        return !sensor.sensorOnline;
      case "occupied":
        return spot.status === 1; // SpotStatus.Occupied
      case "available":
        return spot.status !== 1;
      default:
        return true;
    }
  });

  const onlineCount = spotIds.filter((id) => data.sensors[id]?.sensorOnline).length;
  const offlineCount = spotIds.filter((id) => data.sensors[id] && !data.sensors[id].sensorOnline).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Sensors" subtitle={`${onlineCount} online / ${offlineCount} offline`} />

      <div className="p-8">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by spot #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none w-48 border"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />

          <div className="flex gap-1">
            {(["all", "online", "offline", "occupied", "available"] as FilterMode[]).map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg text-xs capitalize transition-colors"
                  style={{
                    backgroundColor: filter === f ? "var(--surface)" : "transparent",
                    color: filter === f ? "var(--text-primary)" : "var(--text-secondary)",
                  }}
                >
                  {f}
                </button>
              )
            )}
          </div>

          <span className="ml-auto text-xs" style={{ color: "var(--text-secondary)" }}>
            {filtered.length} sensors
          </span>
        </div>

        {/* Sensor grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((id) => {
            const pos = positionForSpotNumber(id);
            if (!pos) return null;
            return (
              <SensorCard
                key={id}
                spotId={id}
                spot={data.grid[pos.row][pos.col]}
                sensor={data.sensors[id]}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
