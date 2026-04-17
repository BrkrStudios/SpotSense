"use client";

import { useSettings } from "@/context/SettingsContext";

export default function AlertPreferences() {
  const { settings, updateAlerts } = useSettings();
  const a = settings.alerts;

  const requestDesktop = async () => {
    if (!("Notification" in window)) return;
    if (a.desktopNotifications) {
      updateAlerts({ desktopNotifications: false });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") updateAlerts({ desktopNotifications: true });
  };

  const dismissOptions = [0, 5, 10, 30, 60];

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        Alert Preferences
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Control how alerts surface to you. Doesn&apos;t affect what the Pi Zeros detect.
      </p>

      <div className="space-y-4">
        <ToggleRow
          label="Sound on new alert"
          description="Play a short chime when a new alert arrives"
          checked={a.soundEnabled}
          onChange={(v) => updateAlerts({ soundEnabled: v })}
        />
        <ToggleRow
          label="Desktop notifications"
          description="Show an OS-level notification for critical alerts"
          checked={a.desktopNotifications}
          onChange={requestDesktop}
        />
        <ToggleRow
          label="Show resolved by default"
          description="Keep resolved alerts visible in the alert list"
          checked={a.showResolvedByDefault}
          onChange={(v) => updateAlerts({ showResolvedByDefault: v })}
        />

        <div>
          <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
            Severities visible in list
          </p>
          <div className="flex flex-wrap gap-2">
            <SeverityChip
              color="#D92626"
              label="Critical"
              active={a.showCritical}
              onClick={() => updateAlerts({ showCritical: !a.showCritical })}
            />
            <SeverityChip
              color="#F59E0B"
              label="Warning"
              active={a.showWarning}
              onClick={() => updateAlerts({ showWarning: !a.showWarning })}
            />
            <SeverityChip
              color="#3B82F6"
              label="Info"
              active={a.showInfo}
              onClick={() => updateAlerts({ showInfo: !a.showInfo })}
            />
          </div>
        </div>

        <div>
          <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
            Auto-dismiss resolved alerts after
          </p>
          <div className="flex flex-wrap gap-2">
            {dismissOptions.map((sec) => {
              const active = a.autoDismissSeconds === sec;
              return (
                <button
                  key={sec}
                  onClick={() => updateAlerts({ autoDismissSeconds: sec })}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "var(--accent)" : "var(--surface)",
                    color: active ? "white" : "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {sec === 0 ? "Never" : `${sec}s`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeverityChip({
  color,
  label,
  active,
  onClick,
}: {
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        backgroundColor: active ? color + "22" : "var(--surface)",
        color: active ? color : "var(--text-secondary)",
        border: `1px solid ${active ? color + "66" : "var(--border)"}`,
        opacity: active ? 1 : 0.6,
      }}
    >
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs" style={{ color: "var(--text-primary)" }}>
          {label}
        </p>
        {description && (
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="shrink-0 w-10 h-6 rounded-full transition-colors relative"
        style={{
          backgroundColor: checked ? "var(--accent)" : "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: checked ? "calc(100% - 1.125rem)" : "0.125rem" }}
        />
      </button>
    </div>
  );
}
