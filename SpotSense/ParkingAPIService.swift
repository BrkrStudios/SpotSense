//
//  ParkingAPIService.swift
//  SpotSense
//
//  Networking layer that polls the admin portal for live parking data.
//

import Foundation

// MARK: - API Response Types

struct ParkingAPISpot: Codable {
    let status: Int
    let isHandicap: Bool
}

struct ParkingAPISensorData: Codable {
    let spotId: Int
    let row: Int?
    let col: Int?
    let distanceMm: Int
    let objectDetected: Bool
    let lastUpdated: String
    let sensorOnline: Bool
    let cameraSnapshotUrl: String?
    let batteryPercent: Int?
    let consecutiveDetections: Int?
}

struct ParkingAPIResponse: Codable {
    let grid: [[ParkingAPISpot]]
    let sensors: [String: ParkingAPISensorData]?
    let lastSync: String
    let piZeroStatus: String
    let backendStatus: String
}

// MARK: - API Service

class ParkingAPIService {
    /// Admin portal URL. Update this to the Railway deployment URL after deploying.
    static let baseURL = "https://spotsense-admin-portal.up.railway.app"
    static let apiKey = "spotsense-2026-demo"

    func fetchParkingData() async throws -> ParkingAPIResponse {
        guard let url = URL(string: "\(Self.baseURL)/api/parking") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
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
