"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import PollingIntervalControl from "@/components/configuration/PollingIntervalControl";
import CameraThresholdControl from "@/components/configuration/CameraThresholdControl";
import SpotDesignationForm from "@/components/configuration/SpotDesignationForm";
import ConfigPreview from "@/components/configuration/ConfigPreview";
import { getMockConfig } from "@/lib/mock-data";
import { SystemConfiguration, SpotDesignation } from "@/lib/types";

export default function ConfigurationPage() {
  const initialConfig = getMockConfig();
  const [pollingInterval, setPollingInterval] = useState(initialConfig.pollingIntervalMs);
  const [cameraThreshold, setCameraThreshold] = useState(initialConfig.cameraThreshold);
  const [designations, setDesignations] = useState<SpotDesignation[]>(initialConfig.spotDesignations);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const currentConfig: SystemConfiguration = {
    pollingIntervalMs: pollingInterval,
    cameraThreshold,
    spotDesignations: designations,
  };

  const isDirty =
    pollingInterval !== initialConfig.pollingIntervalMs ||
    cameraThreshold !== initialConfig.cameraThreshold ||
    JSON.stringify(designations) !== JSON.stringify(initialConfig.spotDesignations);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save to Pi 5
    await new Promise((r) => setTimeout(r, 800));
    setIsSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Configuration" subtitle="Manage sensor and system settings" />

      <div className="flex-1 p-8">
        <div className="grid grid-cols-2 gap-6">
          {/* Left column: controls */}
          <div className="space-y-6">
            <PollingIntervalControl value={pollingInterval} onChange={setPollingInterval} />
            <CameraThresholdControl value={cameraThreshold} onChange={setCameraThreshold} />
            <SpotDesignationForm designations={designations} onChange={setDesignations} />
          </div>

          {/* Right column: preview + save */}
          <div className="space-y-6">
            <ConfigPreview config={currentConfig} />

            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: isDirty ? "#3366E6" : "var(--surface)",
                  color: isDirty ? "white" : "var(--text-secondary)",
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? "Deploying..." : "Save & Deploy to Pi 5"}
              </button>

              {showSuccess && (
                <span className="text-sm font-medium" style={{ color: "#33BF4D" }}>
                  Configuration deployed successfully!
                </span>
              )}

              {!isDirty && !showSuccess && (
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  No changes to deploy
                </span>
              )}
            </div>

            {/* Info box */}
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
                  Controls how often the VL53Lox TOF sensor reads distance. Lower = faster detection, higher = less power usage.
                </li>
                <li>
                  <strong style={{ color: "var(--text-primary)" }}>Camera Threshold:</strong>{" "}
                  The ArduCamera only fires after this many consecutive TOF detections to save power (200-350mA per snapshot).
                </li>
                <li>
                  <strong style={{ color: "var(--text-primary)" }}>Spot Designations:</strong>{" "}
                  Mark spots as handicap, out of service, or reserved. Changes are sent to Pi 5 which relays to Pi 0.
                </li>
                <li>
                  <strong style={{ color: "var(--text-primary)" }}>Demo Mode:</strong>{" "}
                  Currently running in demo mode. Changes are simulated but not sent to actual hardware.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
