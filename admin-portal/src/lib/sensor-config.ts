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
}

export const REAL_SPOTS: RealSpotConfig[] = [
  // Spot 245: camera was previously mounted upside-down so we rotated 180°.
  // Firmware / mount was corrected — images now arrive right-side up, so no
  // rotation is applied. Bump this back to 180 if the hardware flips again.
  { spotNumber: 245, row: 18, col: 2, firebaseSpotId: "A12", deviceId: "spotsense-zero-001", imageRotationDegrees: 0 },
  { spotNumber: 267, row: 19, col: 2, firebaseSpotId: "B12", deviceId: "spotsense-zero-002", imageRotationDegrees: 0 },
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
