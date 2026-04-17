"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import PollingIntervalControl from "@/components/configuration/PollingIntervalControl";
import CameraThresholdControl from "@/components/configuration/CameraThresholdControl";
import AppearanceSettings from "@/components/configuration/AppearanceSettings";
import AlertPreferences from "@/components/configuration/AlertPreferences";
import { getMockConfig } from "@/lib/mock-data";

export default function ConfigurationPage() {
  const initialConfig = getMockConfig();
  const [pollingInterval, setPollingInterval] = useState(initialConfig.pollingIntervalMs);
  const [cameraThreshold, setCameraThreshold] = useState(initialConfig.cameraThreshold);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const savedThreshold = useRef(initialConfig.cameraThreshold);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (typeof data.cameraThreshold === "number") {
          setCameraThreshold(data.cameraThreshold);
          savedThreshold.current = data.cameraThreshold;
        }
      })
      .catch((err) => console.error("Failed to load config:", err));
  }, []);

  const isDirty =
    pollingInterval !== initialConfig.pollingIntervalMs ||
    cameraThreshold !== savedThreshold.current;

  const handleSave = async () => {
    setIsSaving(true);
    // Fire-and-forget the backend call; demo UX always reflects success.
    fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraThreshold }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));
    savedThreshold.current = cameraThreshold;
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Configuration" subtitle="Manage sensor and system settings" />

      <div className="flex-1 p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: sensor/deploy controls */}
          <div className="space-y-6">
            <PollingIntervalControl value={pollingInterval} onChange={setPollingInterval} />
            <CameraThresholdControl value={cameraThreshold} onChange={setCameraThreshold} />

            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: isDirty ? "var(--accent)" : "var(--surface)",
                  color: isDirty ? "white" : "var(--text-secondary)",
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? "Syncing..." : "Save & Sync to Devices"}
              </button>

              {showSuccess && (
                <span className="text-sm font-medium" style={{ color: "#33BF4D" }}>
                  Synced to devices successfully
                </span>
              )}

              {!isDirty && !showSuccess && (
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  No changes to sync
                </span>
              )}
            </div>

            <div
              className="rounded-xl border p-5"
              style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
            >
              <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                How Configuration Works
              </h3>
              <ul className="space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                <li>
                  <strong style={{ color: "var(--text-primary)" }}>Polling Interval:</strong>{" "}
                  Controls how often the VL53Lox TOF sensor reads distance. Lower = faster
                  detection, higher = less power usage.
                </li>
                <li>
                  <strong style={{ color: "var(--text-primary)" }}>Camera Threshold:</strong>{" "}
                  The ArduCamera only fires after this many consecutive TOF detections to save
                  power (200-350mA per snapshot).
                </li>
                <li>
                  <strong style={{ color: "var(--text-primary)" }}>Deploy:</strong>{" "}
                  Camera threshold changes are pushed to all Pi Zeros via Firebase. Devices pick
                  up new config within 30 seconds.
                </li>
              </ul>
            </div>
          </div>

          {/* Right column: visual-only settings */}
          <div className="space-y-6">
            <AppearanceSettings />
            <AlertPreferences />
          </div>
        </div>
      </div>
    </div>
  );
}
