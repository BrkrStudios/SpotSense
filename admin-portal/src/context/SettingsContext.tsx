"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "dark" | "light";
export type Density = "comfortable" | "compact";
export type AccentColor = "blue" | "violet" | "green" | "orange";

export interface AlertPrefs {
  soundEnabled: boolean;
  desktopNotifications: boolean;
  showResolvedByDefault: boolean;
  showCritical: boolean;
  showWarning: boolean;
  showInfo: boolean;
  autoDismissSeconds: number;
}

export interface Settings {
  theme: Theme;
  accent: AccentColor;
  density: Density;
  showLotName: boolean;
  animatedCharts: boolean;
  alerts: AlertPrefs;
}

const DEFAULTS: Settings = {
  theme: "dark",
  accent: "blue",
  density: "comfortable",
  showLotName: true,
  animatedCharts: true,
  alerts: {
    soundEnabled: false,
    desktopNotifications: false,
    showResolvedByDefault: false,
    showCritical: true,
    showWarning: true,
    showInfo: true,
    autoDismissSeconds: 0,
  },
};

const ACCENTS: Record<AccentColor, string> = {
  blue: "#3366E6",
  violet: "#8B5CF6",
  green: "#33BF4D",
  orange: "#F97316",
};

interface SettingsContextValue {
  settings: Settings;
  setTheme: (t: Theme) => void;
  setAccent: (a: AccentColor) => void;
  setDensity: (d: Density) => void;
  setShowLotName: (v: boolean) => void;
  setAnimatedCharts: (v: boolean) => void;
  updateAlerts: (patch: Partial<AlertPrefs>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const STORAGE_KEY = "spotsense.settings.v1";

function applyToDocument(settings: Settings) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.density = settings.density;
  document.documentElement.style.setProperty("--accent", ACCENTS[settings.accent]);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged: Settings = {
          ...DEFAULTS,
          ...parsed,
          alerts: { ...DEFAULTS.alerts, ...(parsed.alerts ?? {}) },
        };
        setSettings(merged);
        applyToDocument(merged);
      } else {
        applyToDocument(DEFAULTS);
      }
    } catch {
      applyToDocument(DEFAULTS);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    applyToDocument(settings);
  }, [settings, hydrated]);

  const value: SettingsContextValue = {
    settings,
    setTheme: (theme) => setSettings((s) => ({ ...s, theme })),
    setAccent: (accent) => setSettings((s) => ({ ...s, accent })),
    setDensity: (density) => setSettings((s) => ({ ...s, density })),
    setShowLotName: (showLotName) => setSettings((s) => ({ ...s, showLotName })),
    setAnimatedCharts: (animatedCharts) => setSettings((s) => ({ ...s, animatedCharts })),
    updateAlerts: (patch) =>
      setSettings((s) => ({ ...s, alerts: { ...s.alerts, ...patch } })),
    reset: () => setSettings(DEFAULTS),
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export const ACCENT_HEX = ACCENTS;
