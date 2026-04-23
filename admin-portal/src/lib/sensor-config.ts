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

// Spot numbering was reworked in 12.4 — spots are now numbered 1..283
// (only usable cells count) instead of 1..308 (raw grid indices).
// The iPhone photos in public/spots/ are filenames keyed to the OLD
// numbers (245.jpg, 267.jpg) to avoid breaking the committed assets;
// the sensor config maps new spot numbers → those filenames.
export const REAL_SPOTS: RealSpotConfig[] = [
  // Row 18, col 2 used to be spot 245 under grid-index numbering.
  // Under sequential usable-cell numbering it's spot 223.
  {
    spotNumber: 223,
    row: 18,
    col: 2,
    firebaseSpotId: "A12",
    deviceId: "spotsense-zero-001",
    imageRotationDegrees: 0,
    staticImageOverride: "/spots/245.jpg",
  },
  // Row 19, col 2 used to be spot 267 → now spot 243.
  {
    spotNumber: 243,
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
