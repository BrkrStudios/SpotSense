import {
  PARKING_ROW_INDICES,
  SPOTS_PER_ROW,
  TOTAL_NUMBERED_SPOTS,
  COLORS,
} from "./constants";
import { SpotStatus, ParkingSpot } from "./types";

/** Convert spot number (1-220) to (row, col) — mirrors Swift ParkingLotMap.position(forSpotNumber:) */
export function positionForSpotNumber(
  spotNumber: number
): { row: number; col: number } | null {
  if (spotNumber < 1 || spotNumber > TOTAL_NUMBERED_SPOTS) return null;
  const zeroIndexed = spotNumber - 1;
  const parkingRowIndex = Math.floor(zeroIndexed / SPOTS_PER_ROW);
  const col = zeroIndexed % SPOTS_PER_ROW;
  const row = PARKING_ROW_INDICES[parkingRowIndex];
  return { row, col };
}

/** Convert (row, col) to spot number (1-220) — mirrors Swift ParkingLotMap.spotNumber(forRow:col:) */
export function spotNumberForPosition(row: number, col: number): number | null {
  const parkingRowIndex = PARKING_ROW_INDICES.indexOf(row);
  if (parkingRowIndex === -1) return null;
  return parkingRowIndex * SPOTS_PER_ROW + col + 1;
}

/** Get status color hex for a parking spot */
export function spotColor(spot: ParkingSpot): string {
  if (spot.status === SpotStatus.Occupied) return COLORS.occupied;
  if (spot.isHandicap) return COLORS.handicap;
  return COLORS.available;
}

/** Check if a spot is available (mirrors Swift ParkingSpot.isAvailable) */
export function isSpotAvailable(spot: ParkingSpot): boolean {
  return (
    spot.status === SpotStatus.Available ||
    spot.status === SpotStatus.Handicap
  );
}

/** Seeded random number generator for consistent mock data */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Format a date as relative time (e.g., "2m ago") */
export function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
