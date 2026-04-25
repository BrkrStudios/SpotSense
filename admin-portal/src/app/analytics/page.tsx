"use client";

import { useMemo } from "react";
import Header from "@/components/layout/Header";
import StatCard from "@/components/dashboard/StatCard";
import OccupancyChart from "@/components/dashboard/OccupancyChart";
import WeeklyOccupancyChart from "@/components/analytics/WeeklyOccupancyChart";
import CSVExportButton from "@/components/analytics/CSVExportButton";
import OccupancyHeatmap from "@/components/analytics/OccupancyHeatmap";
import BusiestSpots from "@/components/analytics/BusiestSpots";
import SensorHealthRing from "@/components/analytics/SensorHealthRing";
import CameraSavingsCard from "@/components/analytics/CameraSavingsCard";
import { useParkingData } from "@/context/ParkingDataContext";
import { generateHistoricalData, computeWeeklyStats } from "@/lib/mock-data";
import { DAY_NAMES } from "@/lib/occupancy-profiles";

// Number of consecutive TOF hits required before the camera fires.
// Only consumed by the Camera Power Savings card.
const CAMERA_THRESHOLD_DEFAULT = 5;

export default function AnalyticsPage() {
  const { occupancyHistory, serverTime, stats, heatmapData, tickCount, occupancyPercent, avgTimeParked } =
    useParkingData();

  const historicalData = useMemo(() => generateHistoricalData(14), []);
  const weeklyStats = useMemo(() => computeWeeklyStats(historicalData), [historicalData]);

  const today = historicalData[historicalData.length - 1];
  const yesterday = historicalData[historicalData.length - 2];

  const avgDailyOcc = useMemo(() => {
    const weekdays = historicalData.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
    if (weekdays.length === 0) return 0;
    return Math.round(
      (weekdays.reduce((sum, d) => sum + d.avgOccupancy, 0) / weekdays.length) * 100
    );
  }, [historicalData]);

  const dayOverDay = useMemo(() => {
    if (!today || !yesterday) return 0;
    return Math.round((today.avgOccupancy - yesterday.avgOccupancy) * 100);
  }, [today, yesterday]);

  const peakHourFormatted = today
    ? `${Math.floor(today.peakHour) % 12 || 12}:${String(Math.round((today.peakHour % 1) * 60)).padStart(2, "0")} ${today.peakHour < 12 ? "AM" : "PM"}`
    : "--";


  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Analytics" subtitle="Historical Reports & Trends" />

      <div className="flex-1 p-4 md:p-8 space-y-6">
        {/* Top row: summary stats + export */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1">
            <StatCard
              label="Avg Weekday Occupancy"
              value={`${avgDailyOcc}%`}
              color={avgDailyOcc > 75 ? "#D92626" : avgDailyOcc > 50 ? "#E6A833" : "#33BF4D"}
              progressPercent={avgDailyOcc}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={avgDailyOcc > 75 ? "#D92626" : "#33BF4D"} strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              }
            />
            <StatCard
              label="Peak Hour Today"
              value={peakHourFormatted}
              color="#F97316"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
            />
            <StatCard
              label="Busiest Day"
              value={DAY_NAMES[weeklyStats.busiestDay]}
              color="#DC2626"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>
          <CSVExportButton data={historicalData} />
        </div>

        {/* Second row: live metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard
            label="Current Occupancy"
            value={`${occupancyPercent}%`}
            color={occupancyPercent > 75 ? "#D92626" : occupancyPercent > 50 ? "#E6A833" : "#33BF4D"}
            progressPercent={occupancyPercent}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                <path d="M3 12l3-3 3 3 4-4 4 4 4-4" />
              </svg>
            }
          />
          <StatCard
            label="Avg Time Parked"
            value={avgTimeParked}
            color="var(--accent)"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l3 3" />
              </svg>
            }
          />
          <StatCard
            label="Day-over-Day"
            value={`${dayOverDay >= 0 ? "+" : ""}${dayOverDay}%`}
            color={dayOverDay > 5 ? "#D92626" : dayOverDay < -5 ? "#33BF4D" : "#9A9AA0"}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dayOverDay >= 0 ? "#D92626" : "#33BF4D"} strokeWidth="2">
                <path d={dayOverDay >= 0 ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"} />
              </svg>
            }
            subtitle="vs yesterday's avg"
          />
        </div>

        {/* Today's occupancy chart (reuses dashboard component) */}
        <OccupancyChart data={occupancyHistory} serverTime={serverTime} />

        {/* Heatmap + Busiest spots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OccupancyHeatmap data={historicalData} />
          <BusiestSpots heatmapData={heatmapData} tickCount={tickCount} />
        </div>

        {/* Sensor health + Camera savings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SensorHealthRing online={stats.sensorsOnline} offline={stats.sensorsOffline} />
          <CameraSavingsCard cameraThreshold={CAMERA_THRESHOLD_DEFAULT} />
        </div>

        {/* Weekly overlay chart */}
        <WeeklyOccupancyChart data={historicalData} />
      </div>
    </div>
  );
}
