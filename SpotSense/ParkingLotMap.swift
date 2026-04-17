//
//  ParkingLotMap.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Pure data model for the HCU Parking Lot 3 layout. This file owns:
//
//   • `SpotStatus` enum that mirrors the backend's status codes.
//   • `ParkingSpot` struct describing one cell.
//   • `LotSection` enum used by "nearby" notifications + section breakdowns.
//   • `ParkingLotMap` class that holds the 22×22 grid and exposes lookup,
//     mutation, and aggregation helpers.
//
//  The lot is modeled as a 22-row by 22-column grid where rows alternate
//  between parking rows and driving lanes. The exact layout is documented
//  in the comment above `ParkingLotMap`.
//

import Foundation
import SwiftUI

// MARK: - Spot Status

/// Status codes match the backend payload (`ParkingAPISpot.status`).
/// Keeping the raw value stable means the API and the app share one schema.
enum SpotStatus: Int, Codable {
    case occupied  = 1   // Vehicle currently parked.
    case available = 2   // Empty regular spot.
    case notASpot  = 3   // Driving lane, light pole, grass, or unusable cell.
    case handicap  = 4   // Reserved for handicap (may itself be occupied).
}

// MARK: - Parking Spot

/// One cell in the parking grid. Includes optional sensor telemetry when the
/// backend has live data for that spot.
struct ParkingSpot: Codable {
    var status: SpotStatus
    var isHandicap: Bool
    var sensorData: ParkingAPISensorData?

    /// `true` when a vehicle is currently in this spot.
    var isOccupied: Bool {
        return status == .occupied
    }

    /// `true` when the spot is open. Handicap spots count as available
    /// when no vehicle is detected.
    var isAvailable: Bool {
        return status == .available || (status == .handicap && !isOccupied)
    }

    /// `true` when the backend reports live sensor data for this spot.
    var hasSensor: Bool {
        return sensorData != nil
    }

    /// Only encode the lightweight fields (status + handicap flag); sensor
    /// telemetry is set in-memory after fetch and not persisted.
    enum CodingKeys: String, CodingKey {
        case status, isHandicap
    }
}

// MARK: - Lot Sections

/// Logical groupings of contiguous parking rows. Used by the section
/// breakdown card on the dashboard and the "nearby spot" notification path.
enum LotSection: String, CaseIterable {
    case a = "A (Front)"
    case b = "B"
    case c = "C"
    case d = "D"
    case e = "E"
    case f = "F"
    case g = "G (Back)"

    /// Inclusive spot-number range owned by each section.
    /// Numbering is row-major over the parking rows (1…308).
    var spotRange: ClosedRange<Int> {
        switch self {
        case .a: return 1...66       // rows 1, 3, 4
        case .b: return 67...110     // rows 6, 7
        case .c: return 111...154    // rows 9, 10
        case .d: return 155...198    // rows 12, 13
        case .e: return 199...242    // rows 15, 16
        case .f: return 243...286    // rows 18, 19
        case .g: return 287...308    // row 21
        }
    }

    /// Reverse lookup: which section does a given spot number belong to?
    static func section(forSpotNumber spot: Int) -> LotSection? {
        return allCases.first { $0.spotRange.contains(spot) }
    }
}

// MARK: - Parking Lot Map

/// In-memory model of the entire parking lot. Holds a 22×22 array of
/// `ParkingSpot` values plus all of the topology metadata (which rows are
/// driving lanes, which cells are handicap, where light poles sit, etc).
///
/// Layout (22 rows):
///
///   Row | Description
///   ----|----------------------------------------------------------
///    0  | Grass lane (top edge)
///    1  | Handicap row (first/last 3 cols are grass)
///    2  | Road lane
///    3  | Handicap row (first/last 3 cols are grass) — facing up
///    4  | Regular parking — facing down (paired with row 3)
///    5  | Driving lane
///    6  | Pair top
///    7  | Pair bottom (col 9 = light pole)
///    8  | Driving lane
///    9  | Pair top    (col 0 unusable, col 1 handicap)
///   10  | Pair bottom (col 0 unusable, col 1 handicap)
///   11  | Driving lane
///   12  | Pair top
///   13  | Pair bottom
///   14  | Driving lane
///   15  | Pair top    (col 0 unusable, col 1 handicap)
///   16  | Pair bottom (col 0 unusable, col 1 handicap)
///   17  | Driving lane
///   18  | Pair top    (col 0 unusable, col 1 handicap, col 8 light pole)
///   19  | Pair bottom (col 0 unusable, col 1 handicap)
///   20  | Driving lane
///   21  | Single bottom row (col 1 unusable, cols 0 and 2 handicap)
///
/// Each row holds 22 cells (columns 0–21).
final class ParkingLotMap {

    // MARK: Static dimensions

    static let spotsPerRow = 22
    static let totalRows   = 22

    // MARK: Storage

    /// Backing 2D array. Outer index = row, inner index = column.
    var map: [[ParkingSpot]]

    // MARK: Topology

    /// Indices of rows that contain real parking spots.
    let parkingRowIndices = [1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21]

    /// Indices of rows that are pure driving lanes / grass.
    let drivingLaneIndices = [0, 2, 5, 8, 11, 14, 17, 20]

    /// Coordinates of every handicap spot in the lot.
    let handicapPositions: [(row: Int, col: Int)] = [
        // Front handicap rows.
        (1, 3), (1, 5), (1, 7), (1, 8),
        (3, 3), (3, 5), (3, 7), (3, 8),
        // Main lot handicap edge column.
        (9, 1), (10, 1),
        (15, 1), (16, 1),
        (18, 1), (19, 1),
        // Back row handicap pair.
        (21, 0), (21, 2),
    ]

    /// Cells inside parking rows that are NOT actually parkable
    /// (light poles, access aisles between handicap pairs, etc).
    let notASpotPositions: [(row: Int, col: Int)] = [
        // Access aisles in front handicap rows.
        (1, 4), (1, 6),
        (3, 4), (3, 6),
        // Light poles and column-0 unusable cells.
        (7, 9),                         // light pole
        (9, 0), (10, 0),
        (15, 0), (16, 0),
        (18, 0), (18, 8),               // (18,8) light pole
        (19, 0),
        (21, 1),
    ]

    /// Cells in handicap rows that are pure grass (lot boundary).
    let grassPositions: [(row: Int, col: Int)] = [
        (1, 0), (1, 1), (1, 2), (1, 19), (1, 20), (1, 21),
        (3, 0), (3, 1), (3, 2), (3, 19), (3, 20), (3, 21),
    ]

    // MARK: Init

    /// Builds an empty lot, marks all the lanes / grass / unusable cells,
    /// and seeds the handicap spots. Real occupancy is layered in later by
    /// the view model from API responses.
    init() {
        // Start with everything available (regular spot).
        map = Array(
            repeating: Array(
                repeating: ParkingSpot(status: .available, isHandicap: false),
                count: ParkingLotMap.spotsPerRow
            ),
            count: ParkingLotMap.totalRows
        )

        // Mark all driving lanes as not-a-spot.
        for laneIndex in drivingLaneIndices {
            for col in 0..<ParkingLotMap.spotsPerRow {
                map[laneIndex][col] = ParkingSpot(status: .notASpot, isHandicap: false)
            }
        }

        // Mark grass cells as not-a-spot.
        for pos in grassPositions {
            map[pos.row][pos.col] = ParkingSpot(status: .notASpot, isHandicap: false)
        }

        // Mark light poles / aisles inside parking rows as not-a-spot.
        for pos in notASpotPositions {
            map[pos.row][pos.col] = ParkingSpot(status: .notASpot, isHandicap: false)
        }

        // Flag handicap cells.
        for pos in handicapPositions {
            map[pos.row][pos.col] = ParkingSpot(status: .handicap, isHandicap: true)
        }
    }

    // MARK: - Spot Mutation

    /// Updates the status of a single cell in-place. No-op if the position
    /// is invalid or refers to a not-a-spot cell (lanes, poles, grass).
    func updateSpot(row: Int, col: Int, status: SpotStatus) {
        guard isValidPosition(row: row, col: col) else { return }
        guard map[row][col].status != .notASpot else { return }

        let isHandicap = map[row][col].isHandicap
        map[row][col] = ParkingSpot(status: status, isHandicap: isHandicap)
    }

    /// Marks a spot as occupied. Returns `true` if successful, `false` if
    /// the cell is invalid or already occupied.
    func parkCar(row: Int, col: Int) -> Bool {
        guard isValidPosition(row: row, col: col) else { return false }
        guard map[row][col].isAvailable else { return false }

        let isHandicap = map[row][col].isHandicap
        map[row][col] = ParkingSpot(status: .occupied, isHandicap: isHandicap)
        return true
    }

    /// Marks an occupied spot as available again (handicap-aware).
    /// Returns `true` if a vehicle was actually present to remove.
    func removeCar(row: Int, col: Int) -> Bool {
        guard isValidPosition(row: row, col: col) else { return false }
        guard map[row][col].status == .occupied else { return false }

        let isHandicap = map[row][col].isHandicap
        map[row][col] = ParkingSpot(
            status: isHandicap ? .handicap : .available,
            isHandicap: isHandicap
        )
        return true
    }

    /// Bounds check used everywhere before indexing into `map`.
    func isValidPosition(row: Int, col: Int) -> Bool {
        return row >= 0 && row < ParkingLotMap.totalRows
            && col >= 0 && col < ParkingLotMap.spotsPerRow
    }

    // MARK: - Aggregations

    /// Counts cells whose status is currently available (handicap-aware).
    func availableSpotCount() -> Int {
        var count = 0
        for row in parkingRowIndices {
            for col in 0..<ParkingLotMap.spotsPerRow {
                if map[row][col].status != .notASpot && map[row][col].isAvailable {
                    count += 1
                }
            }
        }
        return count
    }

    /// Counts cells currently occupied by a vehicle.
    func occupiedSpotCount() -> Int {
        var count = 0
        for row in parkingRowIndices {
            for col in 0..<ParkingLotMap.spotsPerRow {
                if map[row][col].status == .occupied {
                    count += 1
                }
            }
        }
        return count
    }

    /// Counts every parkable cell — used as the denominator in occupancy %.
    func totalSpotCount() -> Int {
        var count = 0
        for row in parkingRowIndices {
            for col in 0..<ParkingLotMap.spotsPerRow {
                if map[row][col].status != .notASpot {
                    count += 1
                }
            }
        }
        return count
    }

    /// Counts how many handicap-designated spots are currently available.
    func availableHandicapSpotCount() -> Int {
        return handicapPositions.filter { map[$0.row][$0.col].status == .handicap }.count
    }

    // MARK: - Spot Numbering

    /// Order in which parking rows are numbered (top to bottom of the lot).
    static let parkingRowOrder = [1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21]

    /// Total numbered spots in the lot (308 = 14 parking rows × 22 cols).
    static let totalNumberedSpots = parkingRowOrder.count * spotsPerRow

    /// Maps a public spot number (1…308) to its `(row, col)` in the grid.
    /// Returns `nil` if the number is out of range.
    static func position(forSpotNumber spotNumber: Int) -> (row: Int, col: Int)? {
        guard spotNumber >= 1 && spotNumber <= totalNumberedSpots else { return nil }
        let zeroIndexed       = spotNumber - 1
        let parkingRowIndex   = zeroIndexed / spotsPerRow
        let col               = zeroIndexed % spotsPerRow
        let row               = parkingRowOrder[parkingRowIndex]
        return (row, col)
    }

    /// Inverse of `position(forSpotNumber:)`. Returns `nil` for cells that
    /// belong to driving lanes (which have no public spot number).
    static func spotNumber(forRow row: Int, col: Int) -> Int? {
        guard let parkingRowIndex = parkingRowOrder.firstIndex(of: row) else { return nil }
        return parkingRowIndex * spotsPerRow + col + 1
    }

    /// Computes the visual center point of a spot inside the legacy
    /// `ParkingLotView` coordinate system. Used by overlay positioning.
    static func centerPoint(forRow row: Int, col: Int) -> CGPoint {
        let roadWidth: CGFloat = 56
        let x = roadWidth + CGFloat(col) * ParkingLotLayout.spotWidth + ParkingLotLayout.spotWidth / 2

        // Walk down the layout vertically until reaching the requested row.
        var y: CGFloat = ParkingLotLayout.laneHeight    // top grass lane

        let aisles: [(top: Int, bottom: Int?, lane: Int?)] = [
            (1, nil, 2),
            (3, 4, 5),
            (6, 7, 8),
            (9, 10, 11),
            (12, 13, 14),
            (15, 16, 17),
            (18, 19, 20),
            (21, nil, nil),
        ]

        for aisle in aisles {
            if row == aisle.top {
                y += ParkingLotLayout.spotHeight / 2
                return CGPoint(x: x, y: y)
            }
            y += ParkingLotLayout.spotHeight

            if let bottom = aisle.bottom {
                if row == bottom {
                    y += ParkingLotLayout.spotHeight / 2
                    return CGPoint(x: x, y: y)
                }
                y += ParkingLotLayout.spotHeight
            }

            if aisle.lane != nil {
                y += ParkingLotLayout.laneHeight
            }
        }

        return CGPoint(x: x, y: y)
    }

    // MARK: - Debug

    /// Dumps an ASCII representation of the current map to the console.
    /// Handy when reproducing layout bugs without the simulator running.
    func printMap() {
        print("\nParking Lot Map:")
        print("Legend: O=Occupied, A=Available, -=Lane/Unusable, H=Handicap(available), X=Handicap(occupied)")
        print(String(repeating: "-", count: ParkingLotMap.spotsPerRow + 10))

        for (rowIndex, row) in map.enumerated() {
            var rowString = String(format: "Row %2d: ", rowIndex)
            for spot in row {
                switch spot.status {
                case .occupied:  rowString += spot.isHandicap ? "X" : "O"
                case .available: rowString += "A"
                case .notASpot:  rowString += "-"
                case .handicap:  rowString += "H"
                }
            }
            rowString += drivingLaneIndices.contains(rowIndex) ? "  (Driving Lane)" : "  (Parking Row)"
            print(rowString)
        }

        print(String(repeating: "-", count: ParkingLotMap.spotsPerRow + 10))
        print("Total Usable Spots:  \(totalSpotCount())")
        print("Available:           \(availableSpotCount())")
        print("Occupied:            \(occupiedSpotCount())")
        print("Handicap Available:  \(availableHandicapSpotCount())")
    }
}
