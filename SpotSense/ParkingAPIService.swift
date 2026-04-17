//
//  ParkingAPIService.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Networking layer that fetches a snapshot of the live parking lot from
//  the admin portal. The portal exposes a single REST endpoint that
//  returns the entire 22 × 22 grid plus optional per-sensor metadata.
//
//  This file owns:
//   • The Codable types that mirror the JSON payload.
//   • A small async/await client with bearer-token auth and a 5 s timeout.
//
//  No personal data is ever requested or returned. Spot status is the only
//  occupancy signal exchanged with the backend.
//

import Foundation

// MARK: - API Response Types

/// One cell in the parking grid as returned by the API.
struct ParkingAPISpot: Codable {
    /// Numeric status code matching `SpotStatus.rawValue`
    /// (1 = occupied, 2 = available, 3 = not-a-spot, 4 = handicap).
    let status: Int

    /// Whether the cell is reserved as a handicap spot.
    let isHandicap: Bool
}

/// Optional per-sensor telemetry. Only spots backed by a hardware sensor
/// have an entry in `ParkingAPIResponse.sensors`.
struct ParkingAPISensorData: Codable {
    let spotId: Int
    let row: Int?
    let col: Int?
    /// Distance reading in millimeters from the ultrasonic sensor.
    let distanceMm: Int
    /// `true` if the sensor currently registers a vehicle.
    let objectDetected: Bool
    /// ISO-8601 timestamp of the latest reading.
    let lastUpdated: String
    /// `false` if the sensor has missed recent heartbeats.
    let sensorOnline: Bool
    /// URL of the latest camera snapshot (if the lot has a camera). Unused
    /// in the current UI; reserved for future spot-detail enhancements.
    let cameraSnapshotUrl: String?
    /// Battery level (0–100) for battery-powered sensors.
    let batteryPercent: Int?
    /// Count of consecutive readings that detected an object — used by the
    /// backend to debounce flickering sensors before flipping a spot's state.
    let consecutiveDetections: Int?
}

/// Top-level payload returned by `GET /api/parking`.
struct ParkingAPIResponse: Codable {
    /// Row-major 2D array of every cell in the lot.
    let grid: [[ParkingAPISpot]]

    /// Optional dictionary keyed by spot id (as `String`) for sensor data.
    let sensors: [String: ParkingAPISensorData]?

    /// ISO-8601 timestamp of when the backend last refreshed this snapshot.
    let lastSync: String

    /// Health string for the on-site Pi Zero gateway.
    let piZeroStatus: String

    /// Health string for the cloud backend itself.
    let backendStatus: String
}

// MARK: - API Service

/// Tiny REST client wrapping the parking endpoint. Uses async/await; the
/// view model is responsible for polling on a timer.
final class ParkingAPIService {

    /// Base URL of the admin portal deployment (Railway).
    static let baseURL = "https://admin-portal-production-9bde.up.railway.app"

    /// Static bearer token for demo deployments. Production would rotate
    /// this and store it in the iOS keychain.
    static let apiKey = "spotsense-2026-demo"

    /// Fetches the latest parking snapshot.
    /// - Throws: `URLError(.badURL)` on misconfigured base URL,
    ///           `URLError(.badServerResponse)` on non-200 HTTP responses,
    ///           or any error thrown by `URLSession` / `JSONDecoder`.
    func fetchParkingData() async throws -> ParkingAPIResponse {
        guard let url = URL(string: "\(Self.baseURL)/api/parking") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        // Polling cadence is ~3 s, so a 5 s timeout balances responsiveness
        // against avoiding spurious failures on slow networks.
        request.timeoutInterval = 5
        request.setValue("Bearer \(Self.apiKey)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        return try JSONDecoder().decode(ParkingAPIResponse.self, from: data)
    }
}
