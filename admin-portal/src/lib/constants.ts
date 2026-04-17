// Layout dimensions — 1:1 match from iOS ParkingLotLayout
export const SPOT_WIDTH = 28;
export const SPOT_HEIGHT = 48;
export const LINE_WIDTH = 1.5;
export const LANE_HEIGHT = 56;
export const ROAD_WIDTH = 56;
export const SPOTS_PER_ROW = 22;
export const TOTAL_ROWS = 22;

// Colors — theme-aware tokens resolve to CSS variables set in globals.css.
// Status colors stay fixed so occupancy/handicap semantics read the same on any theme.
export const COLORS = {
  asphalt: "var(--map-asphalt)",
  line: "var(--map-line)",
  lane: "var(--map-lane)",
  handicap: "#3366E6",
  available: "#33BF4D",
  occupied: "#D92626",
  grass: "var(--grass)",
  road: "var(--map-lane)",
} as const;

// Grid structure
// Row 0: grass lane, Row 1: handicap (grass edges), Row 2: road lane,
// Row 3: handicap (grass edges), Row 4: regular parking (facing down),
// Row 5+: lanes and paired rows
export const PARKING_ROW_INDICES = [1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21];
export const DRIVING_LANE_INDICES = [0, 2, 5, 8, 11, 14, 17, 20];

// Lane types for visual styling
export const LANE_TYPES: Record<number, "grass" | "road" | "lane"> = {
  0: "grass",  // top edge of lot
  2: "road",   // road between handicap rows
  5: "lane",
  8: "lane",
  11: "lane",
  14: "lane",
  17: "lane",
  20: "lane",
};

// Aisle structure — mirrors Swift ParkingLotView.aisles
// bottom: null means a single-row aisle (no paired row)
export const AISLES: { top: number; bottom: number | null; lane: number | null }[] = [
  { top: 1, bottom: null, lane: 2 },    // handicap row + road
  { top: 3, bottom: 4, lane: 5 },       // handicap row (up) + regular row (down) + lane
  { top: 6, bottom: 7, lane: 8 },
  { top: 9, bottom: 10, lane: 11 },
  { top: 12, bottom: 13, lane: 14 },
  { top: 15, bottom: 16, lane: 17 },
  { top: 18, bottom: 19, lane: 20 },
  { top: 21, bottom: null, lane: null },
];

// Row 0 is a grass lane rendered before the first aisle
export const TOP_GRASS_LANE = 0;

// Handicap positions — [row, col]
export const HANDICAP_POSITIONS: [number, number][] = [
  // Handicap rows (rows 1, 3) — spots 1,3,5,6 within non-grass area
  [1, 3], [1, 5], [1, 7], [1, 8],
  [3, 3], [3, 5], [3, 7], [3, 8],
  // Main lot
  [9, 1],
  [10, 1],
  [15, 1],
  [16, 1],
  [18, 1],
  [19, 1],
  [21, 0],
  [21, 2],
];

// Not-a-spot positions within parking rows (light poles, unusable spaces — yellow hatching)
export const NOT_A_SPOT_POSITIONS: [number, number][] = [
  // Handicap rows — access aisles
  [1, 4], [1, 6],
  [3, 4], [3, 6],
  // Main lot
  [7, 9],   // light pole
  [9, 0],
  [10, 0],
  [15, 0],
  [16, 0],
  [18, 0],
  [18, 8],  // light pole
  [19, 0],
  [21, 1],
];

// Grass positions within parking rows (first 3 and last 3 cols on handicap rows — green fill)
export const GRASS_POSITIONS: [number, number][] = [
  [1, 0], [1, 1], [1, 2], [1, 19], [1, 20], [1, 21],
  [3, 0], [3, 1], [3, 2], [3, 19], [3, 20], [3, 21],
];

export const TOTAL_NUMBERED_SPOTS = PARKING_ROW_INDICES.length * SPOTS_PER_ROW; // 308
