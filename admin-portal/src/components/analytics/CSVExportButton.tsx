"use client";

import { DailyOccupancyProfile } from "@/lib/types";

interface CSVExportButtonProps {
  data: DailyOccupancyProfile[];
}

export default function CSVExportButton({ data }: CSVExportButtonProps) {
  const handleExport = () => {
    const rows: string[] = ["Date,Time,Occupied,Available,OccupancyPercent"];

    for (const day of data) {
      for (const point of day.points) {
        const date = new Date(point.timestamp);
        const dateStr = date.toLocaleDateString("en-US");
        const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        const total = point.occupiedCount + point.availableCount;
        const pct = total > 0 ? Math.round((point.occupiedCount / total) * 100) : 0;
        rows.push(`${dateStr},${timeStr},${point.occupiedCount},${point.availableCount},${pct}`);
      }
    }

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spotsense-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
      style={{
        backgroundColor: "var(--surface)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
      </svg>
      Export CSV
    </button>
  );
}
