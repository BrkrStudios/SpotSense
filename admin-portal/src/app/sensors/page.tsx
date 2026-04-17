"use client";

import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import SensorCard from "@/components/sensors/SensorCard";
import SensorListRow from "@/components/sensors/SensorListRow";
import { getMockParkingData } from "@/lib/mock-data";
import { positionForSpotNumber } from "@/lib/utils";
import { TOTAL_NUMBERED_SPOTS } from "@/lib/constants";

type FilterMode = "all" | "online" | "offline" | "occupied" | "available" | "low_battery";
type SortMode = "spot" | "battery" | "updated";
type ViewMode = "list" | "grid";

const FILTER_META: { value: FilterMode; label: string; accent: string }[] = [
  { value: "all", label: "All", accent: "var(--text-primary)" },
  { value: "online", label: "Online", accent: "#33BF4D" },
  { value: "offline", label: "Offline", accent: "#D92626" },
  { value: "occupied", label: "Occupied", accent: "#D92626" },
  { value: "available", label: "Available", accent: "#33BF4D" },
  { value: "low_battery", label: "Low Battery", accent: "#F59E0B" },
];

export default function SensorsPage() {
  const data = getMockParkingData();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortMode>("spot");
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");

  const spotIds = useMemo(
    () => Array.from({ length: TOTAL_NUMBERED_SPOTS }, (_, i) => i + 1),
    []
  );

  const summary = useMemo(() => {
    let online = 0,
      offline = 0,
      lowBattery = 0,
      batterySum = 0,
      batteryCount = 0;
    for (const id of spotIds) {
      const s = data.sensors[id];
      if (!s) continue;
      if (s.sensorOnline) online++;
      else offline++;
      if (s.batteryPercent !== null) {
        batterySum += s.batteryPercent;
        batteryCount++;
        if (s.batteryPercent < 30) lowBattery++;
      }
    }
    return {
      online,
      offline,
      lowBattery,
      avgBattery: batteryCount > 0 ? Math.round(batterySum / batteryCount) : 0,
    };
  }, [data, spotIds]);

  const filtered = useMemo(() => {
    const rows = spotIds
      .map((id) => {
        const sensor = data.sensors[id];
        if (!sensor) return null;
        const pos = positionForSpotNumber(id);
        if (!pos) return null;
        const spot = data.grid[pos.row][pos.col];
        return { id, sensor, spot };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => {
        if (search && !String(r.id).includes(search)) return false;
        switch (filter) {
          case "online":
            return r.sensor.sensorOnline;
          case "offline":
            return !r.sensor.sensorOnline;
          case "occupied":
            return r.spot.status === 1;
          case "available":
            return r.spot.status !== 1;
          case "low_battery":
            return r.sensor.batteryPercent !== null && r.sensor.batteryPercent < 30;
          default:
            return true;
        }
      });

    rows.sort((a, b) => {
      switch (sort) {
        case "battery":
          return (a.sensor.batteryPercent ?? 101) - (b.sensor.batteryPercent ?? 101);
        case "updated":
          return new Date(b.sensor.lastUpdated).getTime() - new Date(a.sensor.lastUpdated).getTime();
        default:
          return a.id - b.id;
      }
    });
    return rows;
  }, [spotIds, data, search, filter, sort]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Sensors" subtitle={`${summary.online} online / ${summary.offline} offline`} />

      <div className="p-4 md:p-8 space-y-5">
        {/* Summary stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile label="Online" value={summary.online} color="#33BF4D" />
          <StatTile label="Offline" value={summary.offline} color="#D92626" />
          <StatTile label="Low Battery" value={summary.lowBattery} color="#F59E0B" />
          <StatTile label="Avg Battery" value={`${summary.avgBattery}%`} color="#3B82F6" />
        </div>

        {/* Toolbar */}
        <div
          className="rounded-xl border p-3 flex flex-wrap items-center gap-3"
          style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
        >
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by spot #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-sm outline-none w-48 border"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="flex gap-1 flex-wrap">
            {FILTER_META.map((f) => {
              const active = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? f.accent + "22" : "transparent",
                    color: active ? f.accent : "var(--text-secondary)",
                    border: `1px solid ${active ? f.accent + "66" : "transparent"}`,
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="spot">Sort: Spot #</option>
              <option value="battery">Sort: Battery (low first)</option>
              <option value="updated">Sort: Last updated</option>
            </select>

            <div
              className="flex rounded-lg overflow-hidden border"
              style={{ borderColor: "var(--border)" }}
            >
              <ViewToggle
                active={view === "list"}
                onClick={() => setView("list")}
                label="List"
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                }
              />
              <ViewToggle
                active={view === "grid"}
                onClick={() => setView("grid")}
                label="Grid"
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                }
              />
            </div>

            <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
              {filtered.length} shown
            </span>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div
            className="rounded-xl border px-5 py-12 text-center text-sm"
            style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            No sensors match your filters
          </div>
        ) : view === "list" ? (
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
          >
            <div
              className="grid grid-cols-[10px_80px_90px_120px_1fr_110px_24px] items-center gap-3 px-4 py-2 text-[10px] uppercase tracking-wider border-b"
              style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
            >
              <span />
              <span>Spot</span>
              <span>Status</span>
              <span>Battery</span>
              <span>Distance</span>
              <span>Updated</span>
              <span />
            </div>
            {filtered.map(({ id, sensor, spot }) => (
              <SensorListRow key={id} spotId={id} spot={spot} sensor={sensor} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(({ id, sensor, spot }) => (
              <SensorCard key={id} spotId={id} spot={spot} sensor={sensor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <p
        className="text-[10px] uppercase tracking-wider mb-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors"
      style={{
        backgroundColor: active ? "var(--accent)" : "var(--surface)",
        color: active ? "white" : "var(--text-secondary)",
      }}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
