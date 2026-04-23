"use client";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const services: { label: string; color: string }[] = [
  { label: "Firebase", color: "#22C55E" },
  { label: "Railway", color: "#22C55E" },
  { label: "Pi 0", color: "#22C55E" },
];

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      className="h-16 flex items-center justify-between px-4 md:px-8 border-b shrink-0"
      style={{
        backgroundColor: "var(--sidebar)",
        borderColor: "var(--border)",
      }}
    >
      <div className="ml-10 md:ml-0">
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

      <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end">
        {services.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: s.color,
                boxShadow: `0 0 6px ${s.color}aa`,
              }}
            />
            <span
              className="text-[11px] md:text-xs font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </header>
  );
}
