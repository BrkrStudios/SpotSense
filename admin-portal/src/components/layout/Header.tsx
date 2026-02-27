"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      className="h-16 flex items-center justify-between px-8 border-b shrink-0"
      style={{
        backgroundColor: "var(--sidebar)",
        borderColor: "var(--border)",
      }}
    >
      <div>
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Pi Status indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Pi 5
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span
              className="text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Pi 0
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
