"use client";

import { useState } from "react";
import { TOTAL_NUMBERED_SPOTS } from "@/lib/constants";

interface MapControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onSearchSpot: (spotId: number) => void;
}

export default function MapControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  onSearchSpot,
}: MapControlsProps) {
  const [searchText, setSearchText] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const isValid =
    searchText !== "" &&
    !isNaN(Number(searchText)) &&
    Number(searchText) >= 1 &&
    Number(searchText) <= TOTAL_NUMBERED_SPOTS;

  const handleSearch = () => {
    if (isValid) {
      onSearchSpot(Number(searchText));
      setSearchText("");
      setShowSearch(false);
    }
  };

  return (
    <div className="absolute top-4 right-4 flex flex-col items-end gap-3 z-10">
      {/* Zoom Controls */}
      <div
        className="flex flex-col rounded-lg overflow-hidden shadow-lg"
        style={{ backgroundColor: "var(--sidebar)" }}
      >
        <button
          onClick={onZoomIn}
          className="px-3 py-2 text-sm font-bold hover:bg-white/10 transition-colors border-b"
          style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
        >
          +
        </button>
        <div
          className="px-3 py-1.5 text-xs text-center tabular-nums"
          style={{ color: "var(--text-secondary)" }}
        >
          {Math.round(scale * 100)}%
        </div>
        <button
          onClick={onZoomOut}
          className="px-3 py-2 text-sm font-bold hover:bg-white/10 transition-colors border-t"
          style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}
        >
          −
        </button>
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="px-3 py-2 rounded-lg text-xs shadow-lg hover:bg-white/10 transition-colors"
        style={{
          backgroundColor: "var(--sidebar)",
          color: "var(--text-secondary)",
        }}
      >
        Reset
      </button>

      {/* Search */}
      {showSearch ? (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg"
          style={{ backgroundColor: "var(--sidebar)" }}
        >
          <input
            type="number"
            min={1}
            max={TOTAL_NUMBERED_SPOTS}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Spot #"
            className="w-20 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={!isValid}
            className="px-2 py-1 text-xs rounded font-medium transition-colors"
            style={{
              backgroundColor: isValid ? "#3366E6" : "var(--surface)",
              color: isValid ? "white" : "var(--text-secondary)",
            }}
          >
            Go
          </button>
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchText("");
            }}
            className="text-xs hover:bg-white/10 p-1 rounded"
            style={{ color: "var(--text-secondary)" }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSearch(true)}
          className="p-2.5 rounded-lg shadow-lg hover:bg-white/10 transition-colors"
          style={{ backgroundColor: "var(--sidebar)" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      )}
    </div>
  );
}
