"use client";

interface SensorStatusBadgeProps {
  online: boolean;
  batteryPercent?: number | null;
}

export default function SensorStatusBadge({ online, batteryPercent }: SensorStatusBadgeProps) {
  const batteryLow = batteryPercent !== null && batteryPercent !== undefined && batteryPercent < 30;

  if (!online) {
    return (
      <span
        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
        style={{ backgroundColor: "#D9262615", color: "#D92626" }}
      >
        Offline
      </span>
    );
  }

  if (batteryLow) {
    return (
      <span
        className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
        style={{ backgroundColor: "#F59E0B15", color: "#F59E0B" }}
      >
        Low Battery
      </span>
    );
  }

  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase"
      style={{ backgroundColor: "#33BF4D15", color: "#33BF4D" }}
    >
      Online
    </span>
  );
}
