import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import { REAL_SPOTS } from "./sensor-config";
import path from "path";

let app: App;
let db: Firestore;

function getDb(): Firestore {
  if (db) return db;

  if (getApps().length === 0) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Railway / production: credentials passed as a JSON string env var
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      app = initializeApp({ credential: cert(serviceAccount) });
    } else {
      // Local dev: credentials loaded from a file
      const credPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.resolve(process.cwd(), "firebase-service-account.json");
      app = initializeApp({ credential: cert(credPath) });
    }
  } else {
    app = getApps()[0];
  }

  db = getFirestore(app);
  return db;
}

export interface FirestoreReading {
  spotId: string;
  deviceId: string;
  occupied: boolean;
  distanceMm: number;
  imagePath: string;
  timestamp: string;
}

/**
 * Fetch the latest sensor reading for each given Firebase spotId (e.g. "A12", "B1").
 * Uses equality-only queries to avoid needing Firestore composite indexes,
 * then sorts client-side to find the latest reading.
 */
export async function fetchLatestReadings(
  firebaseSpotIds: string[]
): Promise<Record<string, FirestoreReading>> {
  const firestore = getDb();
  const results: Record<string, FirestoreReading> = {};

  const queries = firebaseSpotIds.map(async (spotId) => {
    try {
      // Single-field equality query — no composite index needed.
      // Fetch a small batch and sort client-side to find the latest.
      const snap = await firestore
        .collection("sensor_readings")
        .where("spotId", "==", spotId)
        .limit(50)
        .get();

      if (snap.empty) return;

      // Sort client-side by timestamp descending
      const docs = snap.docs
        .map((d) => d.data())
        .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));

      const latestDoc = docs[0];
      const latest: FirestoreReading = {
        spotId: latestDoc.spotId,
        deviceId: latestDoc.deviceId,
        occupied: latestDoc.occupied,
        distanceMm: latestDoc.distanceMm,
        imagePath: latestDoc.imagePath || "",
        timestamp: latestDoc.timestamp,
      };

      // If the latest reading has no image, find the most recent one that does
      if (!latest.imagePath) {
        const withImage = docs.find((d) => d.imagePath);
        if (withImage) {
          latest.imagePath = withImage.imagePath;
        }
      }

      results[spotId] = latest;
    } catch (err) {
      console.error(`[Firebase] Error fetching readings for ${spotId}:`, err);
    }
  });

  await Promise.all(queries);
  return results;
}

export interface DeviceConfig {
  neededHits: number;
}

/**
 * Read config from the first real device as the canonical global config.
 */
export async function readGlobalConfig(): Promise<DeviceConfig | null> {
  if (REAL_SPOTS.length === 0) return null;
  const firestore = getDb();
  try {
    const doc = await firestore
      .collection("device_config")
      .doc(REAL_SPOTS[0].deviceId)
      .get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      neededHits: data.neededHits ?? 5,
    };
  } catch (err) {
    console.error("[Firebase] Error reading global config:", err);
    return null;
  }
}

/**
 * Write config to all real devices in Firestore.
 */
export async function writeGlobalConfig(config: DeviceConfig): Promise<void> {
  const firestore = getDb();
  await Promise.all(
    REAL_SPOTS.map((spot) =>
      firestore
        .collection("device_config")
        .doc(spot.deviceId)
        .set(
          {
            neededHits: config.neededHits,
            lastUpdatedBy: "admin-portal",
            lastUpdatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
    )
  );
}
