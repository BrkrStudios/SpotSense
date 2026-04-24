"use client";

import { SensorReading, ParkingSpot, SpotStatus } from "@/lib/types";
import { spotColor, relativeTime } from "@/lib/utils";
import { getRealSpotByNumber, isRealSpot, getDemoImageForSpot } from "@/lib/sensor-config";

interface SpotDetailPanelProps {
  spotId: number;
  spot: ParkingSpot;
  sensor: SensorReading | null;
  onClose: () => void;
}

export default function SpotDetailPanel({
  spotId,
  spot,
  sensor,
  onClose,
}: SpotDetailPanelProps) {
  const color = spotColor(spot);
  const statusLabel =
    spot.status === SpotStatus.Occupied
      ? "Occupied"
      : spot.isHandicap
      ? "Handicap (Available)"
      : "Available";

  return (
    <div
      className="w-[340px] h-full overflow-y-auto border-l"
      style={{
        backgroundColor: "var(--sidebar)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div>
          <h3
            className="text-base font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Spot {spotId}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {statusLabel}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {sensor && (
        <div className="p-5 space-y-5">
          {/* Sensor Status */}
          <Section title="Sensor Status">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: sensor.sensorOnline ? "#33BF4D" : "#E67E22",
                }}
              />
              <span
                className="text-sm"
                style={{ color: sensor.sensorOnline ? "var(--text-primary)" : "#E67E22" }}
              >
                {sensor.sensorOnline ? "Online" : "Offline"}
              </span>
            </div>
            {!isRealSpot(spotId) && (
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                Last updated: {relativeTime(sensor.lastUpdated)}
              </p>
            )}
            {!sensor.sensorOnline && (
              <p className="text-xs mt-1 font-medium" style={{ color: "#E67E22" }}>
                Sensor not responding — data may be stale
              </p>
            )}
          </Section>

          {/* TOF Distance */}
          <Section title="TOF Distance Reading">
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--text-primary)" }}
              >
                {sensor.distanceMm}
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                mm
              </span>
            </div>
            {/* Distance bar */}
            <div
              className="w-full h-2 rounded-full mt-2"
              style={{ backgroundColor: "var(--surface)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (sensor.distanceMm / 2000) * 100)}%`,
                  backgroundColor: sensor.objectDetected
                    ? "#D92626"
                    : "#33BF4D",
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span
                className="text-[10px]"
                style={{ color: "var(--text-secondary)" }}
              >
                0mm
              </span>
              <span
                className="text-[10px]"
                style={{ color: "var(--text-secondary)" }}
              >
                2000mm
              </span>
            </div>
          </Section>

          {/* Object Detection */}
          <Section title="Object Detection">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: sensor.objectDetected
                    ? "#D92626"
                    : "#33BF4D",
                }}
              />
              <span
                className="text-sm"
                style={{ color: "var(--text-primary)" }}
              >
                {sensor.objectDetected ? "Object Detected" : "No Object"}
              </span>
            </div>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Consecutive detections: {sensor.consecutiveDetections}
            </p>
          </Section>

          {/* Camera Snapshot */}
          <Section title="Camera Snapshot">
            {/*
              Image source:
                - realSpotConfig.staticImageOverride wins when set
                  (see sensor-config.ts). Drop the file under /public/spots/.
                - Live Firebase snapshot path is DISABLED for demo.
                  To restore: delete the staticImageOverride for this
                  spot in sensor-config.ts, then swap the first branch
                  back to the block below:

                  sensor.cameraSnapshotUrl ? (
                    <div className="w-full rounded-lg overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
                      <img
                        src={sensor.cameraSnapshotUrl}
                        alt={`Spot ${spotId} camera snapshot`}
                        className="w-full h-auto rounded-lg"
                        style={{
                          maxHeight: "240px",
                          objectFit: "cover",
                          transform: getRealSpotByNumber(spotId)?.imageRotationDegrees
                            ? `rotate(${getRealSpotByNumber(spotId)!.imageRotationDegrees}deg)`
                            : undefined,
                        }}
                      />
                      <p className="text-[10px] px-2 py-1.5 text-center" style={{ color: "var(--text-secondary)" }}>
                        Live from {getRealSpotByNumber(spotId)?.deviceId ?? "sensor"} · Updated {relativeTime(sensor.lastUpdated)}
                      </p>
                    </div>
                  )
            */}
            {(() => {
              // Same image-source rules as the Sensor detail page:
              //   real spot override → demo image (if online) → placeholder.
              const overrideSrc = getRealSpotByNumber(spotId)?.staticImageOverride;
              const demoSrc = sensor.sensorOnline
                ? getDemoImageForSpot(spotId)
                : null;
              const src = overrideSrc ?? demoSrc;
              if (src) {
                return (
                  <div className="w-full rounded-lg overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
                    <img
                      src={src}
                      alt={`Spot ${spotId} reference photo`}
                      className="w-full h-auto rounded-lg"
                      style={{ maxHeight: "240px", objectFit: "cover" }}
                    />
                    <p className="text-[10px] px-2 py-1.5 text-center" style={{ color: "var(--text-secondary)" }}>
                      Spot {spotId}
                    </p>
                  </div>
                );
              }
              return (
                <div
                  className="w-full aspect-video rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No image available
                  </span>
                </div>
              );
            })()}
          </Section>

          {/* Battery */}
          {sensor.batteryPercent !== null && (
            <Section title="Battery">
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 h-2 rounded-full"
                  style={{ backgroundColor: "var(--surface)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${sensor.batteryPercent}%`,
                      backgroundColor:
                        sensor.batteryPercent > 50
                          ? "#33BF4D"
                          : sensor.batteryPercent > 20
                          ? "#F59E0B"
                          : "#D92626",
                    }}
                  />
                </div>
                <span
                  className="text-sm font-medium tabular-nums"
                  style={{ color: "var(--text-primary)" }}
                >
                  {sensor.batteryPercent}%
                </span>
              </div>
            </Section>
          )}

          {/* Position Info */}
          <Section title="Position">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Row:</span>{" "}
                <span style={{ color: "var(--text-primary)" }}>
                  {sensor.row}
                </span>
              </div>
              <div>
                <span style={{ color: "var(--text-secondary)" }}>Column:</span>{" "}
                <span style={{ color: "var(--text-primary)" }}>
                  {sensor.col}
                </span>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4
        className="text-xs font-medium uppercase tracking-wider mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}
