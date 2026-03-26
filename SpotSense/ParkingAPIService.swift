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

struct ParkingAPISensor: Codable {
    let spotId: Int
    let row: Int
    let col: Int
    let distanceMm: Int
    let objectDetected: Bool
    let lastUpdated: String
    let sensorOnline: Bool
}

struct ParkingAPIResponse: Codable {
    let grid: [[ParkingAPISpot]]
    let lastSync: String
    let piZeroStatus: String
    let piFiveStatus: String
}

// MARK: - API Service

class ParkingAPIService {
    /// Hardcoded to the Mac's local network IP running the Next.js admin portal.
    /// Change this to your Mac's IP if it differs.
    static let baseURL = "http://192.168.68.64:3000"

    func fetchParkingData() async throws -> ParkingAPIResponse {
        guard let url = URL(string: "\(Self.baseURL)/api/parking") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 5

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        return try JSONDecoder().decode(ParkingAPIResponse.self, from: data)
    }
}
