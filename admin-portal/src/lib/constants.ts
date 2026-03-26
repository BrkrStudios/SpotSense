// Layout dimensions — 1:1 match from iOS ParkingLotLayout
export const SPOT_WIDTH = 28;
export const SPOT_HEIGHT = 48;
export const LINE_WIDTH = 1.5;
export const LANE_HEIGHT = 56;
export const ROAD_WIDTH = 56;
export const SPOTS_PER_ROW = 22;
export const TOTAL_ROWS = 23;

// Colors — exact RGB values from iOS ContentView.swift
export const COLORS = {
  asphalt: "#2E2E33", // Color(red: 0.18, green: 0.18, blue: 0.20)
  line: "#D9D9CC", // Color(red: 0.85, green: 0.85, blue: 0.80)
  lane: "#38383D", // Color(red: 0.22, green: 0.22, blue: 0.24)
  handicap: "#3366E6", // Color(red: 0.2, green: 0.4, blue: 0.9)
  available: "#33BF4D", // Color(red: 0.2, green: 0.75, blue: 0.3)
  occupied: "#D92626", // Color(red: 0.85, green: 0.15, blue: 0.15)
  grass: "#2D5A1E",
  road: "#38383D",
} as const;

// Grid structure — mirrors Swift parkingRowIndices / drivingLaneIndices
// Rows 0-4 are new (grass lane, 2 handicap rows, road lane, separator lane)
// Rows 5+ are the original layout shifted by +5
export const PARKING_ROW_INDICES = [1, 3, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22];
export const DRIVING_LANE_INDICES = [0, 2, 4, 6, 9, 12, 15, 18, 21];

// Lane types for visual styling
export const LANE_TYPES: Record<number, "grass" | "road" | "lane"> = {
  0: "grass",  // top edge of lot
  2: "road",   // road between new handicap rows
  4: "lane",   // separator to main lot
  6: "lane",
  9: "lane",
  12: "lane",
  15: "lane",
  18: "lane",
  21: "lane",
};

// Aisle structure — mirrors Swift ParkingLotView.aisles
// bottom: null means a single-row aisle (no paired row)
export const AISLES: { top: number; bottom: number | null; lane: number | null }[] = [
  { top: 1, bottom: null, lane: 2 },    // new handicap row + road
  { top: 3, bottom: null, lane: 4 },    // new handicap row + lane
  { top: 5, bottom: null, lane: 6 },    // single top (no handicap) + lane
  { top: 7, bottom: 8, lane: 9 },
  { top: 10, bottom: 11, lane: 12 },
  { top: 13, bottom: 14, lane: 15 },
  { top: 16, bottom: 17, lane: 18 },
  { top: 19, bottom: 20, lane: 21 },
  { top: 22, bottom: null, lane: null },
];

// Row 0 is a grass lane rendered before the first aisle
export const TOP_GRASS_LANE = 0;

// Handicap positions — [row, col]
export const HANDICAP_POSITIONS: [number, number][] = [
  // New handicap rows (rows 1, 3) — spots 1,3,5,6 within non-grass area
  [1, 3], [1, 5], [1, 7], [1, 8],
  [3, 3], [3, 5], [3, 7], [3, 8],
  // Existing lot (shifted +5)
  [10, 1],
  [11, 1],
  [16, 1],
  [17, 1],
  [19, 1],
  [20, 1],
  [22, 0],
  [22, 2],
];

// Not-a-spot positions within parking rows (light poles, unusable spaces — yellow hatching)
export const NOT_A_SPOT_POSITIONS: [number, number][] = [
  // New handicap rows — access aisles (spots 2,4 within non-grass area)
  [1, 4], [1, 6],
  [3, 4], [3, 6],
  // Existing lot (shifted +5)
  [8, 9],   // light pole
  [10, 0],
  [11, 0],
  [16, 0],
  [17, 0],
  [19, 0],
  [19, 8],  // light pole
  [20, 0],
  [22, 1],
];

// Grass positions within parking rows (first 3 and last 3 cols on new rows — green fill)
export const GRASS_POSITIONS: [number, number][] = [
  [1, 0], [1, 1], [1, 2], [1, 19], [1, 20], [1, 21],
  [3, 0], [3, 1], [3, 2], [3, 19], [3, 20], [3, 21],
];

export const TOTAL_NUMBERED_SPOTS = PARKING_ROW_INDICES.length * SPOTS_PER_ROW; // 308
