"use client";

import Header from "@/components/layout/Header";
import StatCard from "@/components/dashboard/StatCard";
import OccupancyChart from "@/components/dashboard/OccupancyChart";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import SystemHealthSummary from "@/components/dashboard/SystemHealthSummary";
import { useServerTime } from "@/hooks/useServerTime";
import { useLiveParkingData } from "@/hooks/useLiveParkingData";
import { COLORS } from "@/lib/constants";

export default function DashboardPage() {
  const serverTime = useServerTime();
  const { data, stats, occupancyHistory, alerts } = useLiveParkingData(serverTime);

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Dashboard" subtitle="Parking Lot 3 — Overview" />

      <div className="flex-1 p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Available"
            value={stats.available}
            total={stats.totalSpots}
            color={COLORS.available}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.available} strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <StatCard
            label="Occupied"
            value={stats.occupied}
            total={stats.totalSpots}
            color={COLORS.occupied}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.occupied} strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            }
          />
          <StatCard
            label="Handicap Available"
            value={stats.handicapAvailable}
            total={stats.handicapTotal}
            color={COLORS.handicap}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.handicap} strokeWidth="2">
                <circle cx="12" cy="4" r="2" />
                <path d="M12 6v6m-4 8a4 4 0 108 0" />
              </svg>
            }
          />
          <StatCard
            label="Sensors Online"
            value={stats.sensorsOnline}
            total={stats.totalSpots}
            color="#33BF4D"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#33BF4D" strokeWidth="2">
                <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>

        {/* Chart */}
        <OccupancyChart data={occupancyHistory} serverTime={serverTime} />

        {/* Bottom row */}
        <div className="grid grid-cols-2 gap-4">
          <AlertsFeed alerts={alerts} />
          <SystemHealthSummary
            data={data}
            sensorsOnline={stats.sensorsOnline}
            sensorsOffline={stats.sensorsOffline}
          />
        </div>
      </div>
    </div>
  );
}
