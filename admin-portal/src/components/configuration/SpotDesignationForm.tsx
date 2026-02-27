"use client";

import { useState } from "react";
import { SpotDesignation } from "@/lib/types";
import { TOTAL_NUMBERED_SPOTS } from "@/lib/constants";

interface SpotDesignationFormProps {
  designations: SpotDesignation[];
  onChange: (designations: SpotDesignation[]) => void;
}

const designationLabels = {
  normal: "Normal",
  handicap: "Handicap",
  out_of_service: "Out of Service",
  reserved: "Reserved",
};

const designationColors = {
  normal: "#33BF4D",
  handicap: "#3366E6",
  out_of_service: "#6B7280",
  reserved: "#F59E0B",
};

export default function SpotDesignationForm({
  designations,
  onChange,
}: SpotDesignationFormProps) {
  const [search, setSearch] = useState("");

  const desigMap = new Map(designations.map((d) => [d.spotId, d.designation]));

  const spotIds = Array.from({ length: TOTAL_NUMBERED_SPOTS }, (_, i) => i + 1).filter(
    (id) => !search || String(id).includes(search)
  );

  const handleChange = (spotId: number, designation: SpotDesignation["designation"]) => {
    const newDesignations = designations.filter((d) => d.spotId !== spotId);
    if (designation !== "normal") {
      newDesignations.push({ spotId, designation });
    }
    onChange(newDesignations);
  };

  // Show only modified spots + first 20 for brevity
  const shownSpots = search
    ? spotIds.slice(0, 50)
    : [
        ...spotIds.filter((id) => desigMap.has(id)),
        ...spotIds.filter((id) => !desigMap.has(id)).slice(0, 12),
      ];

  return (
    <div
      className="rounded-xl border"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--border)" }}
    >
      <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Spot Designations
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Mark spots as handicap, out of service, or reserved
          </p>
        </div>
        <input
          type="text"
          placeholder="Search spot #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs outline-none w-32 border"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      <div className="overflow-y-auto max-h-[400px]">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="px-5 py-2 text-left text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Spot
              </th>
              <th className="px-5 py-2 text-left text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Current
              </th>
              <th className="px-5 py-2 text-left text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Designation
              </th>
            </tr>
          </thead>
          <tbody>
            {shownSpots.map((id) => {
              const current = desigMap.get(id) || "normal";
              return (
                <tr
                  key={id}
                  className="border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-5 py-2">
                    <span className="text-sm font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
                      #{id}
                    </span>
                  </td>
                  <td className="px-5 py-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${designationColors[current]}15`,
                        color: designationColors[current],
                      }}
                    >
                      {designationLabels[current]}
                    </span>
                  </td>
                  <td className="px-5 py-2">
                    <select
                      value={current}
                      onChange={(e) =>
                        handleChange(id, e.target.value as SpotDesignation["designation"])
                      }
                      className="px-2 py-1 rounded text-xs outline-none border cursor-pointer"
                      style={{
                        backgroundColor: "var(--surface)",
                        borderColor: "var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <option value="normal">Normal</option>
                      <option value="handicap">Handicap</option>
                      <option value="out_of_service">Out of Service</option>
                      <option value="reserved">Reserved</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!search && (
        <div className="px-5 py-2 border-t" style={{ borderColor: "var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Showing {shownSpots.length} of {TOTAL_NUMBERED_SPOTS} spots. Search to find specific spots.
          </span>
        </div>
      )}
    </div>
  );
}
