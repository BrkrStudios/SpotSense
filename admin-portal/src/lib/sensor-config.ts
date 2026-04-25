/**
 * Client-safe config for the two real hardware spots in the lot.
 *
 * Kept free of server-side imports (no firebase-admin, no fs) so it can
 * be pulled into "use client" components without dragging node-only
 * modules through Next.js's bundler.
 */

export interface RealSpotConfig {
  /** Internal spot number that lines up with the grid-index numbering. */
  spotNumber: number;
  /** Grid row the spot sits in (see PARKING_ROW_INDICES). */
  row: number;
  /** Grid column (0..21). */
  col: number;
  /** Firestore `spotId` field (e.g. "A12"). What the Pi actually writes. */
  firebaseSpotId: string;
  /** Human-friendly device name for the Pi wired to this spot. */
  deviceId: string;
}

export const REAL_SPOTS: RealSpotConfig[] = [
  { spotNumber: 245, row: 18, col: 2, firebaseSpotId: "A12", deviceId: "spotsense-zero-001" },
  { spotNumber: 267, row: 19, col: 2, firebaseSpotId: "B12", deviceId: "spotsense-zero-002" },
];

/** Quick-lookup set of spot numbers that have real hardware behind them. */
export const REAL_SPOT_IDS = new Set(REAL_SPOTS.map((s) => s.spotNumber));

export function isRealSpot(spotNumber: number): boolean {
  return REAL_SPOT_IDS.has(spotNumber);
}

export function isRealSpotPosition(row: number, col: number): boolean {
  return REAL_SPOTS.some((s) => s.row === row && s.col === col);
}

export function getRealSpotByNumber(spotNumber: number): RealSpotConfig | undefined {
  return REAL_SPOTS.find((s) => s.spotNumber === spotNumber);
}

/**
 * Rotating pool of placeholder photos for simulated (non-hardware) spots.
 * Real spots show whatever the Pi uploaded to Firebase; simulated spots
 * pick one of these four so the Camera Snapshot card isn't always empty
 * across the rest of the lot.
 */
const DEMO_IMAGES = [
  "/spots/demo-1.jpg",
  "/spots/demo-2.jpg",
  "/spots/demo-3.jpg",
  "/spots/demo-4.jpg",
] as const;

/**
 * Returns the placeholder image path for a simulated spot, or null if
 * the spot is a real hardware spot (real spots use the live Firebase
 * snapshot URL). The choice is stable per spotId so the same spot
 * always shows the same car.
 */
export function getDemoImageForSpot(spotId: number): string | null {
  if (isRealSpot(spotId)) return null;
  return DEMO_IMAGES[spotId % DEMO_IMAGES.length];
}
