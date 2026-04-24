/**
 * Client-safe real spot configuration.
 * This file has NO server-side dependencies (no firebase-admin).
 * Safe to import from "use client" components.
 */

export interface RealSpotConfig {
  spotNumber: number;       // Grid spot number (245, 267)
  row: number;              // Grid row index
  col: number;              // Grid column index
  firebaseSpotId: string;   // Firestore spotId field ("A12", "B12")
  deviceId: string;         // Pi Zero device name
  /**
   * Degrees to rotate the camera snapshot when displayed in the admin portal.
   * Use when a camera is physically mounted inverted and the firmware
   * doesn't correct orientation before upload. Default: 0 (no rotation).
   */
  imageRotationDegrees?: number;
  /**
   * Optional static image path (under /public) to show in place of the
   * live Firebase camera snapshot. Useful for demo builds where you want
   * the Parking Map / Sensor detail view to show a specific photo
   * instead of whatever the Pi most recently uploaded. Set to undefined
   * (or delete the field) to fall back to the live snapshot.
   */
  staticImageOverride?: string;
}

// Spot numbering is grid-index based (1..308) to match the iOS app.
// Real hardware spots 245 and 267 sit at grid positions [row 18, col 2]
// and [row 19, col 2] respectively.
export const REAL_SPOTS: RealSpotConfig[] = [
  {
    spotNumber: 245,
    row: 18,
    col: 2,
    firebaseSpotId: "A12",
    deviceId: "spotsense-zero-001",
    imageRotationDegrees: 0,
    staticImageOverride: "/spots/245.jpg",
  },
  {
    spotNumber: 267,
    row: 19,
    col: 2,
    firebaseSpotId: "B12",
    deviceId: "spotsense-zero-002",
    imageRotationDegrees: 0,
    staticImageOverride: "/spots/267.jpg",
  },
];

/** Set of all real spot numbers for fast lookups */
export const REAL_SPOT_IDS = new Set(REAL_SPOTS.map((s) => s.spotNumber));

/** Check if a spot number is a real (hardware) spot */
export function isRealSpot(spotNumber: number): boolean {
  return REAL_SPOT_IDS.has(spotNumber);
}

/** Check if a grid position belongs to a real spot */
export function isRealSpotPosition(row: number, col: number): boolean {
  return REAL_SPOTS.some((s) => s.row === row && s.col === col);
}

/** Get a real spot config by its spot number */
export function getRealSpotByNumber(spotNumber: number): RealSpotConfig | undefined {
  return REAL_SPOTS.find((s) => s.spotNumber === spotNumber);
}

/**
 * Ordered list of demo reference photos served from /public/spots/.
 * Used as placeholder camera snapshots for simulated (non-real) spots.
 * Four images cycle by spotId so adjacent spots show different cars.
 */
const DEMO_IMAGES = [
  "/spots/demo-1.jpg",
  "/spots/demo-2.jpg",
  "/spots/demo-3.jpg",
  "/spots/demo-4.jpg",
] as const;

/**
 * Returns the demo image path for a simulated spot, or null if the spot
 * is a real hardware spot (those use their own staticImageOverride).
 * The image is chosen by `spotId % DEMO_IMAGES.length` so the cars
 * alternate predictably — same spot always gets the same car.
 */
export function getDemoImageForSpot(spotId: number): string | null {
  if (isRealSpot(spotId)) return null;
  return DEMO_IMAGES[spotId % DEMO_IMAGES.length];
}
