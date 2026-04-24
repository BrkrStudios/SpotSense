"use client";

import Header from "@/components/layout/Header";
import StatCard from "@/components/dashboard/StatCard";
import OccupancyChart from "@/components/dashboard/OccupancyChart";
import AlertsFeed from "@/components/dashboard/AlertsFeed";
import LiveActivityFeed from "@/components/dashboard/LiveActivityFeed";
import SystemHealthSummary from "@/components/dashboard/SystemHealthSummary";
import { useParkingData } from "@/context/ParkingDataContext";
import { COLORS } from "@/lib/constants";

export default function DashboardPage() {
  const { data, stats, occupancyHistory, alerts, activityFeed, serverTime, occupancyPercent, avgTimeParked } = useParkingData();

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Dashboard" subtitle="Parking Lot 3 — Overview" />

      <div className="flex-1 p-4 md:p-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <StatCard
            label="Total Occupancy"
            value={`${occupancyPercent}%`}
            color={occupancyPercent > 85 ? COLORS.occupied : occupancyPercent > 60 ? "#E6A833" : COLORS.available}
            progressPercent={occupancyPercent}
            subtitle={`${stats.occupied} of ${stats.totalSpots} spots`}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={occupancyPercent > 85 ? COLORS.occupied : occupancyPercent > 60 ? "#E6A833" : COLORS.available} strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            }
          />
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
            label="Avg Time Parked"
            value={avgTimeParked}
            color="#A855F7"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
          />
          <StatCard
            label="Handicap Available"
            value={stats.handicapAvailable}
            total={stats.handicapTotal}
            color={COLORS.handicap}
            icon={
              // Wheelchair-person profile — matches the icon drawn on
              // each handicap spot tile in the parking map.
              <svg width="16" height="16" viewBox="0 0 100 100">
                <g stroke={COLORS.handicap} strokeLinecap="round" fill="none">
                  <circle cx="62" cy="18" r="10" fill={COLORS.handicap} stroke="none" />
                  <line x1="57" y1="30" x2="50" y2="56" strokeWidth="10" />
                  <line x1="58" y1="36" x2="80" y2="42" strokeWidth="9" />
                  <line x1="46" y1="58" x2="68" y2="58" strokeWidth="9" />
                  <line x1="68" y1="58" x2="82" y2="72" strokeWidth="9" />
                  <circle cx="42" cy="72" r="22" strokeWidth="8" />
                </g>
              </svg>
            }
          />
          <StatCard
            label="Sensors Online"
            value={stats.sensorsOnline}
            total={stats.sensorsOnline + stats.sensorsOffline}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertsFeed alerts={alerts} />
          <LiveActivityFeed events={activityFeed} />
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
