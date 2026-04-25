"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { positionForSpotNumber, spotColor, relativeTime } from "@/lib/utils";
import { SpotStatus, SensorReading } from "@/lib/types";
import { isRealSpot, getRealSpotByNumber, getDemoImageForSpot } from "@/lib/sensor-config";
import { useParkingData } from "@/context/ParkingDataContext";

export default function SensorDetailPage({
  params,
}: {
  params: Promise<{ spotId: string }>;
}) {
  const { spotId: spotIdStr } = use(params);
  const spotId = Number(spotIdStr);
  const { data } = useParkingData();
  const sensor = data.sensors[spotId];
  const pos = positionForSpotNumber(spotId);

  // For real spots, poll the API to get live data including camera snapshot
  const [liveSensor, setLiveSensor] = useState<SensorReading | null>(null);
  const realSpotConfig = getRealSpotByNumber(spotId);

  const fetchLiveData = useCallback(async () => {
    if (!isRealSpot(spotId)) return;
    try {
      const res = await fetch(`/api/parking/spot/${spotId}`);
      if (res.ok) {
        const data = await res.json();
        setLiveSensor(data);
      }
    } catch { /* retry next interval */ }
  }, [spotId]);

  useEffect(() => {
    fetchLiveData();
    if (isRealSpot(spotId)) {
      const interval = setInterval(fetchLiveData, 3000);
      return () => clearInterval(interval);
    }
  }, [spotId, fetchLiveData]);

  // Use live sensor data for real spots, fall back to context data
  const displaySensor = liveSensor ?? sensor;

  if (!displaySensor || !pos) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header title="Sensor Detail" />
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: "var(--text-secondary)" }}>Sensor not found</p>
        </div>
      </div>
    );
  }

  const spot = data.grid[pos.row][pos.col];
  const color = spotColor(spot);
  const statusLabel =
    spot.status === SpotStatus.Occupied
      ? "Occupied"
      : spot.isHandicap
      ? "Handicap (Available)"
      : "Available";

  return (
    <div className="min-h-screen flex flex-col">
      <Header title={`Sensor — Spot ${spotId}`} subtitle={`Row ${pos.row}, Column ${pos.col}`} />

      <div className="p-8">
        <Link
          href="/sensors"
          className="text-sm mb-6 inline-flex items-center gap-1 hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Back to Sensors
        </Link>

        <div className="grid grid-cols-2 gap-6 mt-4">
          {/* Left column */}
          <div className="space-y-6">
            {/* Status */}
            <Card title="Spot Status">
              <div className="flex items-center gap-3">
                <div
                  className="w-5 h-5 rounded"
                  style={{ backgroundColor: color }}
                />
                <span className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {statusLabel}
                </span>
              </div>
            </Card>

            {/* TOF Distance */}
            <Card title="TOF Distance Reading">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {displaySensor.distanceMm}
                </span>
                <span className="text-lg" style={{ color: "var(--text-secondary)" }}>mm</span>
              </div>
              <div className="w-full h-3 rounded-full" style={{ backgroundColor: "var(--surface)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (displaySensor.distanceMm / 2000) * 100)}%`,
                    backgroundColor: displaySensor.objectDetected ? "#D92626" : "#33BF4D",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>0mm (object touching)</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>2000mm (max range)</span>
              </div>
            </Card>

            {/* Object Detection */}
            <Card title="Object Detection">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: displaySensor.objectDetected ? "#D92626" : "#33BF4D" }}
                />
                <span className="text-base" style={{ color: "var(--text-primary)" }}>
                  {displaySensor.objectDetected ? "Object Detected" : "No Object"}
                </span>
              </div>
              <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
                Consecutive detections: <strong style={{ color: "var(--text-primary)" }}>{displaySensor.consecutiveDetections}</strong>
              </p>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Sensor Health */}
            <Card title="Sensor Health">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Status</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: displaySensor.sensorOnline ? "#33BF4D" : "#E67E22" }}
                    />
                    <span className="text-sm font-medium" style={{ color: displaySensor.sensorOnline ? "var(--text-primary)" : "#E67E22" }}>
                      {displaySensor.sensorOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
                {!isRealSpot(spotId) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Last Updated</span>
                    <span className="text-sm" style={{ color: "var(--text-primary)" }} suppressHydrationWarning>
                      {relativeTime(displaySensor.lastUpdated)}
                    </span>
                  </div>
                )}
                {displaySensor.batteryPercent !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Battery</span>
                      <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {displaySensor.batteryPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ backgroundColor: "var(--surface)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${displaySensor.batteryPercent}%`,
                          backgroundColor:
                            displaySensor.batteryPercent > 50 ? "#33BF4D" : displaySensor.batteryPercent > 20 ? "#F59E0B" : "#D92626",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/*
              Camera snapshot card. Priority:
                1. Free spot → placeholder (real cameras only fire on
                   consecutive TOF hits, so an empty spot has no photo).
                2. Real hardware spot + occupied + Firebase sent an
                   imagePath → live snapshot from Firebase.
                3. Simulated spot + occupied + sensor online → rotating
                   demo photo from /public/spots/.
                4. Occupied but nothing available → "No image" placeholder.
            */}
            <Card title="Camera Snapshot">
              {(() => {
                const isOccupied = spot.status === SpotStatus.Occupied;
                if (!isOccupied) {
                  return (
                    <div
                      className="w-full aspect-video rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: "var(--surface)" }}
                    >
                      <div className="text-center">
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          Spot is free
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                          Camera only captures when the spot is occupied
                        </p>
                      </div>
                    </div>
                  );
                }
                const liveSrc = displaySensor.cameraSnapshotUrl;
                const demoSrc = displaySensor.sensorOnline
                  ? getDemoImageForSpot(spotId)
                  : null;
                const src = liveSrc ?? demoSrc;
                if (src) {
                  return (
                    <div className="w-full rounded-lg overflow-hidden" style={{ backgroundColor: "var(--surface)" }}>
                      <img
                        src={src}
                        alt={`Spot ${spotId} camera snapshot`}
                        className="w-full h-auto rounded-lg"
                        style={{ maxHeight: "300px", objectFit: "cover" }}
                      />
                      <p className="text-[10px] px-3 py-2 text-center" style={{ color: "var(--text-secondary)" }}>
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
                    <div className="text-center">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" className="mx-auto mb-2">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        No image available
                      </p>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Position */}
            <Card title="Position Info">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Spot ID</span>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{spotId}</p>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Handicap</span>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{spot.isHandicap ? "Yes" : "No"}</p>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Row</span>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{pos.row}</p>
                </div>
                <div>
                  <span style={{ color: "var(--text-secondary)" }}>Column</span>
                  <p className="font-medium" style={{ color: "var(--text-primary)" }}>{pos.col}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
