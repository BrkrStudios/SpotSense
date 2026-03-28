"use client";

import { useState, useMemo } from "react";
import Header from "@/components/layout/Header";
import AlertFilters from "@/components/alerts/AlertFilters";
import AlertItem from "@/components/alerts/AlertItem";
import { useParkingData } from "@/context/ParkingDataContext";
import { Alert } from "@/lib/types";

type Severity = "all" | Alert["severity"];
type AlertType = "all" | Alert["type"];

export default function AlertsPage() {
  const { alerts, resolveAlert } = useParkingData();
  const [severity, setSeverity] = useState<Severity>("all");
  const [type, setType] = useState<AlertType>("all");
  const [showResolved, setShowResolved] = useState(false);

  const counts = useMemo(() => {
    const c = { total: 0, critical: 0, warning: 0, info: 0, resolved: 0 };
    for (const a of alerts) {
      if (a.resolved) {
        c.resolved++;
        continue;
      }
      c.total++;
      c[a.severity]++;
    }
    return c;
  }, [alerts]);

  const filtered = useMemo(() => {
    return alerts
      .filter((a) => {
        if (!showResolved && a.resolved) return false;
        if (severity !== "all" && a.severity !== severity) return false;
        if (type !== "all" && a.type !== type) return false;
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [alerts, severity, type, showResolved]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Alerts" subtitle="Real-Time Alert Feed" />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Filters */}
        <AlertFilters
          severity={severity}
          onSeverityChange={setSeverity}
          type={type}
          onTypeChange={setType}
          showResolved={showResolved}
          onShowResolvedChange={setShowResolved}
          counts={counts}
        />

        {/* Alert list */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
        >
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <svg
                className="mx-auto mb-3"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-secondary)"
                strokeWidth="1.5"
              >
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                No alerts match your filters
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filtered.map((alert) => (
                <AlertItem key={alert.id} alert={alert} onResolve={resolveAlert} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
