"use client";

import { useMemo } from "react";
import Header from "@/components/layout/Header";
import StatCard from "@/components/dashboard/StatCard";
import OccupancyChart from "@/components/dashboard/OccupancyChart";
import WeeklyOccupancyChart from "@/components/analytics/WeeklyOccupancyChart";
import PeakHoursChart from "@/components/analytics/PeakHoursChart";
import CSVExportButton from "@/components/analytics/CSVExportButton";
import { useParkingData } from "@/context/ParkingDataContext";
import { generateHistoricalData, computeWeeklyStats } from "@/lib/mock-data";
import { DAY_NAMES } from "@/lib/occupancy-profiles";

export default function AnalyticsPage() {
  const { occupancyHistory, serverTime } = useParkingData();

  const historicalData = useMemo(() => generateHistoricalData(14), []);
  const weeklyStats = useMemo(() => computeWeeklyStats(historicalData), [historicalData]);

  const today = historicalData[historicalData.length - 1];
  const avgDailyOcc = useMemo(() => {
    const weekdays = historicalData.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
    if (weekdays.length === 0) return 0;
    return Math.round((weekdays.reduce((sum, d) => sum + d.avgOccupancy, 0) / weekdays.length) * 100);
  }, [historicalData]);

  const peakHourFormatted = today
    ? `${Math.floor(today.peakHour) % 12 || 12}:${String(Math.round((today.peakHour % 1) * 60)).padStart(2, "0")} ${today.peakHour < 12 ? "AM" : "PM"}`
    : "--";

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Analytics" subtitle="Historical Reports & Trends" />

      <div className="flex-1 p-4 md:p-8 space-y-6">
        {/* Top row: summary stats + export */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
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
            <StatCard
              label="Avg Turnover"
              value={`${weeklyStats.avgTurnoverRate}x/day`}
              color="#A855F7"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            />
          </div>
          <CSVExportButton data={historicalData} />
        </div>

        {/* Today's occupancy chart (reuses dashboard component) */}
        <OccupancyChart data={occupancyHistory} serverTime={serverTime} />

        {/* Weekly overlay chart */}
        <WeeklyOccupancyChart data={historicalData} />

        {/* Peak hours bar chart */}
        <PeakHoursChart stats={weeklyStats} />
      </div>
    </div>
  );
}
