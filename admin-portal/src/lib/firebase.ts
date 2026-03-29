import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import path from "path";

let app: App;
let db: Firestore;

function getDb(): Firestore {
  if (db) return db;

  if (getApps().length === 0) {
    const credPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.resolve(process.cwd(), "firebase-service-account.json");

    app = initializeApp({
      credential: cert(credPath),
    });
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
 * Uses simple single-field queries (no composite index needed) and sorts client-side.
 */
export async function fetchLatestReadings(
  firebaseSpotIds: string[]
): Promise<Record<string, FirestoreReading>> {
  const firestore = getDb();
  const results: Record<string, FirestoreReading> = {};

  // Query for each spotId in parallel — only filter by spotId, sort client-side
  const queries = firebaseSpotIds.map(async (spotId) => {
    try {
      const snapshot = await firestore
        .collection("sensor_readings")
        .where("spotId", "==", spotId)
        .limit(50)
        .get();

      if (!snapshot.empty) {
        // Find the latest reading by timestamp (client-side sort)
        let latest: FirestoreReading | null = null;
        let latestTime = "";

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const ts = data.timestamp || "";
          if (ts > latestTime) {
            latestTime = ts;
            latest = {
              spotId: data.spotId,
              deviceId: data.deviceId,
              occupied: data.occupied,
              distanceMm: data.distanceMm,
              imagePath: data.imagePath || "",
              timestamp: data.timestamp,
            };
          }
        }

        if (latest) {
          results[spotId] = latest;
        }
      }
    } catch (err) {
      console.error(`[Firebase] Error fetching readings for ${spotId}:`, err);
    }
  });

  await Promise.all(queries);
  return results;
}
