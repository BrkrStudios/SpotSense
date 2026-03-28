"use client";

import { SystemConfiguration } from "@/lib/types";

interface ConfigPreviewProps {
  config: SystemConfiguration;
}

export default function ConfigPreview({ config }: ConfigPreviewProps) {
  const json = JSON.stringify(config, null, 2);

  return (
    <div
      className="rounded-xl border"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Config Preview
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
          JSON payload that will be deployed to Pi 0
        </p>
      </div>
      <pre
        className="p-5 text-xs font-mono overflow-x-auto leading-relaxed"
        style={{ color: "var(--text-primary)" }}
      >
        {json}
      </pre>
    </div>
  );
}
