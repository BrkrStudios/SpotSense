import Foundation
import SwiftUI

// MARK: - Spot Status
enum SpotStatus: Int, Codable {
    case occupied = 1      // Car parked
    case available = 2     // No car
    case notASpot = 3      // Driving lane, light pole, unusable
    case handicap = 4      // Handicap spot (can be occupied or available)
}

// MARK: - Parking Spot
struct ParkingSpot: Codable {
    var status: SpotStatus
    var isHandicap: Bool

    var isOccupied: Bool {
        return status == .occupied
    }

    var isAvailable: Bool {
        return status == .available || (status == .handicap && !isOccupied)
    }
}

// MARK: - Parking Lot Map
class ParkingLotMap {
    /*
     Layout (23 rows):

     Row Index | Description
     -------------------------------------------------------
     0         | Grass Lane (top edge)
     1         | Handicap row (first/last 3 cols = grass, spots 1,3,5,6 HC, 2,4 unusable)
     2         | Road Lane
     3         | Handicap row (first/last 3 cols = grass, spots 1,3,5,6 HC, 2,4 unusable)
     4         | Driving Lane (separator)
     5         | Single top row (no handicap)
     6         | Driving Lane
     7         | Pair top
     8         | Pair bottom (col 9 = light pole)
     9         | Driving Lane
     10        | Pair top (col 0 unusable, col 1 handicap)
     11        | Pair bottom (col 0 unusable, col 1 handicap)
     12        | Driving Lane
     13        | Pair top (normal)
     14        | Pair bottom (normal)
     15        | Driving Lane
     16        | Pair top (col 0 unusable, col 1 handicap)
     17        | Pair bottom (col 0 unusable, col 1 handicap)
     18        | Driving Lane
     19        | Pair top (col 0 unusable, col 1 handicap, col 8 = light pole)
     20        | Pair bottom (col 0 unusable, col 1 handicap)
     21        | Driving Lane
     22        | Single bottom row (col 1 unusable, col 0 & col 2 handicap)

     Each row has 22 spots (columns 0-21)
    */

    static let spotsPerRow = 22
    static let totalRows = 23

    // The 2D array backend
    var map: [[ParkingSpot]]

    // Parking row indices (actual spots, not driving lanes)
    let parkingRowIndices = [1, 3, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22]
    let drivingLaneIndices = [0, 2, 4, 6, 9, 12, 15, 18, 21]

    // Handicap spot positions (row, column)
    let handicapPositions: [(row: Int, col: Int)] = [
        // New handicap rows (rows 1, 3)
        (1, 3), (1, 5), (1, 7), (1, 8),
        (3, 3), (3, 5), (3, 7), (3, 8),
        // Existing lot
        (10, 1),
        (11, 1),
        (16, 1),
        (17, 1),
        (19, 1),
        (20, 1),
        (22, 0),
        (22, 2),
    ]

    // Not-a-spot positions within parking rows (light poles, unusable spaces)
    let notASpotPositions: [(row: Int, col: Int)] = [
        // New handicap rows — access aisles
        (1, 4), (1, 6),
        (3, 4), (3, 6),
        // Existing lot
        (8, 9),   // light pole
        (10, 0),
        (11, 0),
        (16, 0),
        (17, 0),
        (19, 0),
        (19, 8),  // light pole
        (20, 0),
        (22, 1),
    ]

    // Grass positions within parking rows (first 3 and last 3 cols on new rows)
    let grassPositions: [(row: Int, col: Int)] = [
        (1, 0), (1, 1), (1, 2), (1, 19), (1, 20), (1, 21),
        (3, 0), (3, 1), (3, 2), (3, 19), (3, 20), (3, 21),
    ]

    init() {
        // Initialize empty map
        map = Array(repeating: Array(repeating: ParkingSpot(status: .available, isHandicap: false),
                                     count: ParkingLotMap.spotsPerRow),
                    count: ParkingLotMap.totalRows)

        // Set driving lanes as notASpot
        for laneIndex in drivingLaneIndices {
            for col in 0..<ParkingLotMap.spotsPerRow {
                map[laneIndex][col] = ParkingSpot(status: .notASpot, isHandicap: false)
            }
        }

        // Set grass positions as notASpot
        for pos in grassPositions {
            map[pos.row][pos.col] = ParkingSpot(status: .notASpot, isHandicap: false)
        }

        // Set not-a-spot positions within parking rows
        for pos in notASpotPositions {
            map[pos.row][pos.col] = ParkingSpot(status: .notASpot, isHandicap: false)
        }

        // Set handicap spots
        for pos in handicapPositions {
            map[pos.row][pos.col] = ParkingSpot(status: .handicap, isHandicap: true)
        }
    }

    // MARK: - Spot Management

    /// Update a spot's status
    func updateSpot(row: Int, col: Int, status: SpotStatus) {
        guard isValidPosition(row: row, col: col) else { return }
        guard map[row][col].status != .notASpot else { return }

        let isHandicap = map[row][col].isHandicap
        map[row][col] = ParkingSpot(status: status, isHandicap: isHandicap)
    }

    /// Park a car in a spot
    func parkCar(row: Int, col: Int) -> Bool {
        guard isValidPosition(row: row, col: col) else { return false }
        guard map[row][col].isAvailable else { return false }

        let isHandicap = map[row][col].isHandicap
        map[row][col] = ParkingSpot(status: .occupied, isHandicap: isHandicap)
        return true
    }

    /// Remove a car from a spot
    func removeCar(row: Int, col: Int) -> Bool {
        guard isValidPosition(row: row, col: col) else { return false }
        guard map[row][col].status == .occupied else { return false }

        let isHandicap = map[row][col].isHandicap
        map[row][col] = ParkingSpot(status: isHandicap ? .handicap : .available, isHandicap: isHandicap)
        return true
    }

    /// Check if position is valid
    func isValidPosition(row: Int, col: Int) -> Bool {
        return row >= 0 && row < ParkingLotMap.totalRows &&
               col >= 0 && col < ParkingLotMap.spotsPerRow
    }

    // MARK: - Statistics

    /// Get total available spots
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

    /// Get total occupied spots
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

    /// Get total parking spots (excluding driving lanes and unusable spots)
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

    /// Get available handicap spots
    func availableHandicapSpotCount() -> Int {
        return handicapPositions.filter { map[$0.row][$0.col].status == .handicap }.count
    }

    // MARK: - Spot Numbering

    static let parkingRowOrder = [1, 3, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22]
    static let totalNumberedSpots = parkingRowOrder.count * spotsPerRow  // 308

    /// Convert a spot number (1-308) to (row, col)
    static func position(forSpotNumber spotNumber: Int) -> (row: Int, col: Int)? {
        guard spotNumber >= 1 && spotNumber <= totalNumberedSpots else { return nil }
        let zeroIndexed = spotNumber - 1
        let parkingRowIndex = zeroIndexed / spotsPerRow
        let col = zeroIndexed % spotsPerRow
        let row = parkingRowOrder[parkingRowIndex]
        return (row, col)
    }

    /// Convert (row, col) to spot number (1-308), returns nil for driving lanes
    static func spotNumber(forRow row: Int, col: Int) -> Int? {
        guard let parkingRowIndex = parkingRowOrder.firstIndex(of: row) else { return nil }
        return parkingRowIndex * spotsPerRow + col + 1
    }

    /// Calculate the center point of a spot in ParkingLotView coordinates
    static func centerPoint(forRow row: Int, col: Int) -> CGPoint {
        let roadWidth: CGFloat = 56
        let x = roadWidth + CGFloat(col) * ParkingLotLayout.spotWidth + ParkingLotLayout.spotWidth / 2

        // Start after the top grass lane
        var y: CGFloat = ParkingLotLayout.laneHeight

        let aisles: [(top: Int, bottom: Int?, lane: Int?)] = [
            (1, nil, 2),
            (3, nil, 4),
            (5, nil, 6),
            (7, 8, 9),
            (10, 11, 12),
            (13, 14, 15),
            (16, 17, 18),
            (19, 20, 21),
            (22, nil, nil),
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

    /// Print the map to console (for debugging)
    func printMap() {
        print("\nParking Lot Map:")
        print("Legend: O=Occupied, A=Available, -=Lane/Unusable, H=Handicap(available), X=Handicap(occupied)")
        print(String(repeating: "-", count: ParkingLotMap.spotsPerRow + 10))

        for (rowIndex, row) in map.enumerated() {
            var rowString = String(format: "Row %2d: ", rowIndex)
            for spot in row {
                switch spot.status {
                case .occupied:
                    rowString += spot.isHandicap ? "X" : "O"
                case .available:
                    rowString += "A"
                case .notASpot:
                    rowString += "-"
                case .handicap:
                    rowString += "H"
                }
            }

            // Add row description
            if drivingLaneIndices.contains(rowIndex) {
                rowString += "  (Driving Lane)"
            } else {
                rowString += "  (Parking Row)"
            }

            print(rowString)
        }

        print(String(repeating: "-", count: ParkingLotMap.spotsPerRow + 10))
        print("Total Usable Spots: \(totalSpotCount())")
        print("Available: \(availableSpotCount())")
        print("Occupied: \(occupiedSpotCount())")
        print("Handicap Available: \(availableHandicapSpotCount())")
    }
}
