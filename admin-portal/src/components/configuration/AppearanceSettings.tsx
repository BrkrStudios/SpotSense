"use client";

import { useSettings, AccentColor, Theme, Density, ACCENT_HEX } from "@/context/SettingsContext";

const themeOptions: { value: Theme; label: string; icon: string }[] = [
  { value: "dark", label: "Dark", icon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" },
  { value: "light", label: "Light", icon: "M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" },
];

const accentOptions: AccentColor[] = ["blue", "violet", "green", "orange"];
const densityOptions: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

export default function AppearanceSettings() {
  const { settings, setTheme, setAccent, setDensity, setAnimatedCharts, setShowLotName } =
    useSettings();

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <h3 className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>
        Appearance
      </h3>
      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
        Visual-only settings. Never touches sensor data.
      </p>

      <div className="space-y-4">
        {/* Theme */}
        <div>
          <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
            Theme
          </label>
          <div className="flex gap-2">
            {themeOptions.map((opt) => {
              const active = settings.theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "var(--accent)" : "var(--surface)",
                    color: active ? "white" : "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={opt.icon} />
                  </svg>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent color */}
        <div>
          <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
            Accent color
          </label>
          <div className="flex gap-2">
            {accentOptions.map((c) => {
              const active = settings.accent === c;
              return (
                <button
                  key={c}
                  onClick={() => setAccent(c)}
                  aria-label={c}
                  className="w-8 h-8 rounded-full transition-transform"
                  style={{
                    backgroundColor: ACCENT_HEX[c],
                    border: active ? "2px solid var(--text-primary)" : "2px solid transparent",
                    transform: active ? "scale(1.1)" : "scale(1)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Density */}
        <div>
          <label className="block text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
            Density
          </label>
          <div className="flex gap-2">
            {densityOptions.map((opt) => {
              const active = settings.density === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDensity(opt.value)}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "var(--accent)" : "var(--surface)",
                    color: active ? "white" : "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles */}
        <ToggleRow
          label="Animated charts"
          description="Smooth transitions on graphs and counters"
          checked={settings.animatedCharts}
          onChange={setAnimatedCharts}
        />
        <ToggleRow
          label="Show lot name in sidebar"
          description="Display the parking lot label under the status dot"
          checked={settings.showLotName}
          onChange={setShowLotName}
        />
      </div>
    </div>
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
