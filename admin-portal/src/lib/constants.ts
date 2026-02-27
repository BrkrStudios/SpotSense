// Layout dimensions — 1:1 match from iOS ParkingLotLayout
export const SPOT_WIDTH = 28;
export const SPOT_HEIGHT = 48;
export const LINE_WIDTH = 1.5;
export const LANE_HEIGHT = 56;
export const SPOTS_PER_ROW = 22;
export const TOTAL_ROWS = 14;

// Colors — exact RGB values from iOS ContentView.swift
export const COLORS = {
  asphalt: "#2E2E33", // Color(red: 0.18, green: 0.18, blue: 0.20)
  line: "#D9D9CC", // Color(red: 0.85, green: 0.85, blue: 0.80)
  lane: "#38383D", // Color(red: 0.22, green: 0.22, blue: 0.24)
  handicap: "#3366E6", // Color(red: 0.2, green: 0.4, blue: 0.9)
  available: "#33BF4D", // Color(red: 0.2, green: 0.75, blue: 0.3)
  occupied: "#D92626", // Color(red: 0.85, green: 0.15, blue: 0.15)
} as const;

// Grid structure — mirrors Swift parkingRowIndices / drivingLaneIndices
export const PARKING_ROW_INDICES = [0, 1, 3, 4, 6, 7, 9, 10, 12, 13];
export const DRIVING_LANE_INDICES = [2, 5, 8, 11];

// Aisle structure — mirrors Swift ParkingLotView.aisles
export const AISLES: { top: number; bottom: number; lane: number | null }[] = [
  { top: 0, bottom: 1, lane: 2 },
  { top: 3, bottom: 4, lane: 5 },
  { top: 6, bottom: 7, lane: 8 },
  { top: 9, bottom: 10, lane: 11 },
  { top: 12, bottom: 13, lane: null },
];

// Handicap positions — matches Swift handicapPositions
export const HANDICAP_POSITIONS: [number, number][] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
  [3, 0],
  [3, 1],
  [4, 0],
  [4, 1],
];

export const TOTAL_NUMBERED_SPOTS = PARKING_ROW_INDICES.length * SPOTS_PER_ROW; // 220
