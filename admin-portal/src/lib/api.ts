import {
  ParkingLotData,
  SensorReading,
  ParkingStats,
  Alert,
  OccupancyDataPoint,
  SystemConfiguration,
} from "./types";
import {
  getMockParkingData,
  getMockStats,
  getMockAlerts,
  getMockOccupancyHistory,
  getMockConfig,
} from "./mock-data";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const PI5_BASE_URL =
  process.env.NEXT_PUBLIC_PI5_API_URL || "http://localhost:5000";

export const api = {
  getParkingData: async (): Promise<ParkingLotData> => {
    if (isDemoMode) return getMockParkingData();
    const res = await fetch(`${PI5_BASE_URL}/api/parking`);
    return res.json();
  },

  getStats: async (): Promise<ParkingStats> => {
    if (isDemoMode) return getMockStats();
    const res = await fetch(`${PI5_BASE_URL}/api/stats`);
    return res.json();
  },

  getSensorDetail: async (spotId: number): Promise<SensorReading> => {
    if (isDemoMode) {
      const data = getMockParkingData();
      return data.sensors[spotId];
    }
    const res = await fetch(`${PI5_BASE_URL}/api/sensors/${spotId}`);
    return res.json();
  },

  getAlerts: async (): Promise<Alert[]> => {
    if (isDemoMode) return getMockAlerts();
    const res = await fetch(`${PI5_BASE_URL}/api/alerts`);
    return res.json();
  },

  getOccupancyHistory: async (): Promise<OccupancyDataPoint[]> => {
    if (isDemoMode) return getMockOccupancyHistory();
    const res = await fetch(`${PI5_BASE_URL}/api/occupancy-history`);
    return res.json();
  },

  getConfig: async (): Promise<SystemConfiguration> => {
    if (isDemoMode) return getMockConfig();
    const res = await fetch(`${PI5_BASE_URL}/api/config`);
    return res.json();
  },

  updateConfig: async (config: SystemConfiguration): Promise<void> => {
    if (isDemoMode) {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 800));
      return;
    }
    await fetch(`${PI5_BASE_URL}/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  },
};
