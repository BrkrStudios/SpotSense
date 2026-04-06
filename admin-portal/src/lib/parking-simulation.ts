/**
 * Server-side parking lot simulation singleton.
 * Runs the same simulation logic that was previously in ParkingDataContext (browser),
 * but on the Node.js server so both admin portal and iOS app see identical state.
 *
 * Uses globalThis to survive Next.js HMR in dev mode.
 */

import {
  ParkingSpot,
  ParkingLotData,
  SensorReading,
  SpotStatus,
  ActivityEvent,
} from "./types";
import {
  PARKING_ROW_INDICES,
  SPOTS_PER_ROW,
  TOTAL_NUMBERED_SPOTS,
  NOT_A_SPOT_POSITIONS,
  GRASS_POSITIONS,
} from "./constants";
import { getMockParkingData } from "./mock-data";
import { DAY_PROFILES, interpolateProfile } from "./occupancy-profiles";
import { isRealSpotPosition } from "./sensor-config";
import { spotNumberForPosition, getParkingLotLocalTime } from "./utils";
import { getRealSpotsData, REAL_SPOTS } from "./sensor";

interface SimulationState {
  data: ParkingLotData;
  activityFeed: ActivityEvent[];
  tickCount: number;
  eventCounter: number;
  simInterval: ReturnType<typeof setInterval> | null;
  realSpotInterval: ReturnType<typeof setInterval> | null;
}

const GLOBAL_KEY = "__parkingSimulation" as const;
const USABLE_SPOTS =
  TOTAL_NUMBERED_SPOTS - NOT_A_SPOT_POSITIONS.length - GRASS_POSITIONS.length;

/** Immediately snap occupancy to the current day/time target if it's far off.
 *  Called on every API request so it self-corrects even when HMR preserves stale state. */
function correctOccupancyIfNeeded(state: SimulationState): void {
  const { hour, dayOfWeek } = getParkingLotLocalTime();
  const profile = DAY_PROFILES[dayOfWeek];
  const targetOccupied = Math.round(interpolateProfile(profile, hour) * USABLE_SPOTS);

  let currentOccupied = 0;
  for (const rowIdx of PARKING_ROW_INDICES) {
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      if (state.data.grid[rowIdx][col].status === SpotStatus.Occupied) currentOccupied++;
    }
  }

  const diff = targetOccupied - currentOccupied;
  if (Math.abs(diff) <= 15) return; // close enough, let the tick handle it

  const candidates: { row: number; col: number }[] = [];
  for (const rowIdx of PARKING_ROW_INDICES) {
    for (let col = 0; col < SPOTS_PER_ROW; col++) {
      if (isRealSpotPosition(rowIdx, col)) continue;
      const spot = state.data.grid[rowIdx][col];
      if (spot.status === SpotStatus.NotASpot) continue;
      if (diff > 0 && spot.status !== SpotStatus.Occupied) {
        candidates.push({ row: rowIdx, col });
      } else if (diff < 0 && spot.status === SpotStatus.Occupied) {
        candidates.push({ row: rowIdx, col });
      }
    }
  }

  // Shuffle candidates for random selection
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const nowStr = new Date().toISOString();
  for (const { row, col } of candidates.slice(0, Math.abs(diff))) {
    const spot = state.data.grid[row][col];
    state.data.grid[row][col] = diff > 0
      ? { status: SpotStatus.Occupied, isHandicap: spot.isHandicap }
      : { status: spot.isHandicap ? SpotStatus.Handicap : SpotStatus.Available, isHandicap: spot.isHandicap };

    const sid = spotNumberForPosition(row, col);
    if (sid && state.data.sensors[sid]) {
      const isOcc = state.data.grid[row][col].status === SpotStatus.Occupied;
      state.data.sensors[sid] = {
        ...state.data.sensors[sid],
        objectDetected: isOcc,
        lastUpdated: nowStr,
        distanceMm: isOcc ? Math.floor(50 + Math.random() * 350) : Math.floor(1200 + Math.random() * 800),
        consecutiveDetections: isOcc ? Math.floor(3 + Math.random() * 7) : 0,
      };
    }
  }
}

function getOrCreateSimulation(): SimulationState {
  const g = globalThis as unknown as Record<string, SimulationState | undefined>;
  if (g[GLOBAL_KEY]) return g[GLOBAL_KEY]!;

  const mockData = getMockParkingData();
  const state: SimulationState = {
    data: {
      grid: mockData.grid.map((row) => row.map((spot) => ({ ...spot }))),
      sensors: { ...mockData.sensors },
      lastSync: new Date().toISOString(),
      piZeroStatus: "online",
      backendStatus: "online",
    },
    activityFeed: [],
    tickCount: 0,
    eventCounter: 0,
    simInterval: null,
    realSpotInterval: null,
  };

  g[GLOBAL_KEY] = state;
  startSimulation(state);
  return state;
}

function startSimulation(state: SimulationState): void {
  if (state.simInterval) return; // already running

  const totalPRows = PARKING_ROW_INDICES.length;

  // --- Main simulation tick (every 3.5s) ---
  state.simInterval = setInterval(() => {
    const newGrid = state.data.grid.map((row) => row.map((spot) => ({ ...spot })));
    const newSensors = { ...state.data.sensors };
    const newEvents: ActivityEvent[] = [];

    // Day profile targeting — use local timezone, not server UTC
    const { hour, dayOfWeek } = getParkingLotLocalTime();
    const profile = DAY_PROFILES[dayOfWeek];
    const targetFraction = interpolateProfile(profile, hour);
    const targetOccupied = Math.round(targetFraction * USABLE_SPOTS);

    // Count current occupied
    let currentOccupied = 0;
    for (const rowIdx of PARKING_ROW_INDICES) {
      for (let col = 0; col < SPOTS_PER_ROW; col++) {
        if (newGrid[rowIdx][col].status === SpotStatus.Occupied) currentOccupied++;
      }
    }

    // Bias direction
    const needMore = currentOccupied < targetOccupied;
    const diff = Math.abs(currentOccupied - targetOccupied);
    const numChanges =
      diff > 50
        ? 8 + Math.floor(Math.random() * 5)
        : diff > 20
          ? 3 + Math.floor(Math.random() * 3)
          : 1 + Math.floor(Math.random() * 3);

    // Weighted random pick: front-left spots are more desirable
    const pickWeightedSpot = (preferFront: boolean) => {
      for (let attempt = 0; attempt < 10; attempt++) {
        let ri: number, ci: number;
        if (preferFront) {
          ri = Math.floor(Math.pow(Math.random(), 1.6) * totalPRows);
          ci = Math.floor(Math.pow(Math.random(), 1.4) * SPOTS_PER_ROW);
        } else {
          ri = Math.floor((1 - Math.pow(Math.random(), 1.6)) * totalPRows);
          ci = Math.floor((1 - Math.pow(Math.random(), 1.4)) * SPOTS_PER_ROW);
        }
        ri = Math.min(ri, totalPRows - 1);
        ci = Math.min(ci, SPOTS_PER_ROW - 1);
        return { rowIdx: PARKING_ROW_INDICES[ri], col: ci };
      }
      return {
        rowIdx: PARKING_ROW_INDICES[Math.floor(Math.random() * totalPRows)],
        col: Math.floor(Math.random() * SPOTS_PER_ROW),
      };
    };

    // Toggle spots
    for (let i = 0; i < numChanges; i++) {
      const { rowIdx, col } = pickWeightedSpot(needMore);
      if (isRealSpotPosition(rowIdx, col)) continue;

      const spotId = spotNumberForPosition(rowIdx, col);
      if (spotId && newSensors[spotId] && !newSensors[spotId].sensorOnline) continue;

      const spot = newGrid[rowIdx][col];
      if (spot.status === SpotStatus.NotASpot) continue;
      const oldStatus = spot.status;

      if (spot.status === SpotStatus.Occupied && (!needMore || Math.random() < 0.2)) {
        newGrid[rowIdx][col] = {
          status: spot.isHandicap ? SpotStatus.Handicap : SpotStatus.Available,
          isHandicap: spot.isHandicap,
        };
      } else if (
        (spot.status === SpotStatus.Available || spot.status === SpotStatus.Handicap) &&
        (needMore || Math.random() < 0.2)
      ) {
        newGrid[rowIdx][col] = {
          status: SpotStatus.Occupied,
          isHandicap: spot.isHandicap,
        };
      }

      // Activity event
      if (spotId && newGrid[rowIdx][col].status !== oldStatus) {
        state.eventCounter++;
        newEvents.push({
          id: `${Date.now()}-${spotId}-${state.eventCounter}`,
          timestamp: new Date().toISOString(),
          spotId,
          oldStatus,
          newStatus: newGrid[rowIdx][col].status,
          isHandicap: newGrid[rowIdx][col].isHandicap,
        });
      }
    }

    // Sync sensor readings for simulated spots
    for (const rowIdx of PARKING_ROW_INDICES) {
      for (let col = 0; col < SPOTS_PER_ROW; col++) {
        if (isRealSpotPosition(rowIdx, col)) continue;
        const sid = spotNumberForPosition(rowIdx, col);
        if (!sid || !newSensors[sid]) continue;
        if (!newSensors[sid].sensorOnline) continue;
        const isOccupied = newGrid[rowIdx][col].status === SpotStatus.Occupied;
        const wasOccupied = newSensors[sid].objectDetected;
        const statusChanged = isOccupied !== wasOccupied;
        newSensors[sid] = {
          ...newSensors[sid],
          distanceMm: isOccupied
            ? Math.floor(50 + Math.random() * 350)
            : Math.floor(1200 + Math.random() * 800),
          objectDetected: isOccupied,
          consecutiveDetections: isOccupied ? Math.floor(3 + Math.random() * 7) : 0,
          lastUpdated: statusChanged ? new Date().toISOString() : newSensors[sid].lastUpdated,
        };
      }
    }

    // Commit state
    state.data.grid = newGrid;
    state.data.sensors = newSensors;
    state.data.lastSync = new Date().toISOString();
    state.activityFeed = [...newEvents, ...state.activityFeed].slice(0, 30);
    state.tickCount++;
  }, 3500);

  // --- Real spot polling (every 3s) ---
  const fetchRealSpots = async () => {
    try {
      const realDataMap = await getRealSpotsData();
      for (const config of REAL_SPOTS) {
        const realData = realDataMap[config.spotNumber];
        if (realData) {
          state.data.grid[config.row][config.col] = {
            status: realData.status,
            isHandicap: false,
          };
          state.data.sensors[config.spotNumber] = realData.sensor;
        }
      }

      const onlineCount = Object.keys(realDataMap).length;
      state.data.piZeroStatus =
        onlineCount === REAL_SPOTS.length
          ? "online"
          : onlineCount > 0
            ? "degraded"
            : "offline";
      if (onlineCount > 0) {
        state.data.lastSync = new Date().toISOString();
      }
    } catch {
      // Will retry next interval
    }
  };

  fetchRealSpots();
  state.realSpotInterval = setInterval(fetchRealSpots, 1500);
}

/**
 * Get the current simulation state. Auto-starts the simulation on first call.
 * Also self-corrects occupancy if it has drifted far from the day/time target —
 * this handles HMR in dev mode where globalThis persists but the bulk catch-up
 * in startSimulation never runs again.
 */
export function getSimulationState() {
  const state = getOrCreateSimulation();
  correctOccupancyIfNeeded(state);
  return {
    grid: state.data.grid,
    sensors: state.data.sensors,
    lastSync: state.data.lastSync,
    piZeroStatus: state.data.piZeroStatus,
    backendStatus: state.data.backendStatus,
    activityFeed: state.activityFeed,
    tickCount: state.tickCount,
  };
}
