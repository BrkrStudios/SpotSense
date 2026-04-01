import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
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
 * Uses simple single-field queries (no composite index needed) and sorts client-side.
 */
export async function fetchLatestReadings(
  firebaseSpotIds: string[]
): Promise<Record<string, FirestoreReading>> {
  const firestore = getDb();
  const results: Record<string, FirestoreReading> = {};

  // Query for each spotId in parallel — order by timestamp desc, take latest 1
  // Also fetch latest-with-image separately so we always have a snapshot URL
  const queries = firebaseSpotIds.map(async (spotId) => {
    try {
      const [latestSnap, latestImageSnap] = await Promise.all([
        firestore
          .collection("sensor_readings")
          .where("spotId", "==", spotId)
          .orderBy("timestamp", "desc")
          .limit(1)
          .get(),
        firestore
          .collection("sensor_readings")
          .where("spotId", "==", spotId)
          .where("imagePath", "!=", "")
          .orderBy("imagePath")
          .orderBy("timestamp", "desc")
          .limit(1)
          .get(),
      ]);

      if (!latestSnap.empty) {
        const data = latestSnap.docs[0].data();
        const latest: FirestoreReading = {
          spotId: data.spotId,
          deviceId: data.deviceId,
          occupied: data.occupied,
          distanceMm: data.distanceMm,
          imagePath: data.imagePath || "",
          timestamp: data.timestamp,
        };

        // Fill in image from the latest-with-image query if the newest reading has none
        if (!latest.imagePath && !latestImageSnap.empty) {
          latest.imagePath = latestImageSnap.docs[0].data().imagePath || "";
        }

        results[spotId] = latest;
      }
    } catch (err) {
      console.error(`[Firebase] Error fetching readings for ${spotId}:`, err);
    }
  });

  await Promise.all(queries);
  return results;
}
