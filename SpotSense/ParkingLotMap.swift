import Foundation
import SwiftUI

// MARK: - Spot Status
enum SpotStatus: Int, Codable {
    case occupied = 1      // Car parked
    case available = 2     // No car
    case notASpot = 3      // Driving lane, grass, etc.
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
     Layout based on aerial image:

     Row Index | Description
     -------------------------------------------------------
     0         | Row 1 - Top side (facing up)
     1         | Row 1 - Bottom side (facing down)
     2         | Driving Lane (notASpot)
     3         | Row 2 - Top side
     4         | Row 2 - Bottom side
     5         | Driving Lane (notASpot)
     6         | Row 3 - Top side
     7         | Row 3 - Bottom side
     8         | Driving Lane (notASpot)
     9         | Row 4 - Top side
     10        | Row 4 - Bottom side
     11        | Driving Lane (notASpot)
     12        | Row 5 - Top side
     13        | Row 5 - Bottom side

     Each row has 22 spots (columns 0-21)
     Handicap spots are on the left side (columns 0-1 typically)
    */

    static let spotsPerRow = 22
    static let totalRows = 14  // 5 parking rows × 2 depths + 4 driving lanes

    // The 2D array backend
    var map: [[ParkingSpot]]

    // Parking row indices (actual spots, not driving lanes)
    let parkingRowIndices = [0, 1, 3, 4, 6, 7, 9, 10, 12, 13]
    let drivingLaneIndices = [2, 5, 8, 11]

    // Handicap spot positions (row, column)
    let handicapPositions: [(row: Int, col: Int)] = [
        (0, 0), (0, 1),   // Row 1 top - leftmost spots
        (1, 0), (1, 1),   // Row 1 bottom - leftmost spots
        (3, 0), (3, 1),   // Row 2 top
        (4, 0), (4, 1),   // Row 2 bottom
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
                if map[row][col].isAvailable {
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

    /// Get total parking spots (excluding driving lanes)
    func totalSpotCount() -> Int {
        return parkingRowIndices.count * ParkingLotMap.spotsPerRow
    }

    /// Get available handicap spots
    func availableHandicapSpotCount() -> Int {
        return handicapPositions.filter { map[$0.row][$0.col].status == .handicap }.count
    }

    // MARK: - Debug

    /// Print the map to console (for debugging)
    func printMap() {
        print("\nParking Lot Map:")
        print("Legend: O=Occupied, A=Available, -=Lane, H=Handicap(available), X=Handicap(occupied)")
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
                let parkingRow = (rowIndex / 3) + 1
                let side = rowIndex % 3 == 0 ? "Top" : "Bottom"
                rowString += "  (Parking Row \(parkingRow) - \(side))"
            }

            print(rowString)
        }

        print(String(repeating: "-", count: ParkingLotMap.spotsPerRow + 10))
        print("Total Spots: \(totalSpotCount())")
        print("Available: \(availableSpotCount())")
        print("Occupied: \(occupiedSpotCount())")
        print("Handicap Available: \(availableHandicapSpotCount())")
    }
}

// MARK: - Example Usage
/*
let parkingLot = ParkingLotMap()

// Simulate a few cars parked (based on the image - ~2-3 cars visible)
parkingLot.parkCar(row: 3, col: 0)   // Blue car in row 2
parkingLot.parkCar(row: 7, col: 5)   // Silver car in row 3

// Print the map
parkingLot.printMap()

// Check availability
print("Is spot (3, 0) available? \(parkingLot.map[3][0].isAvailable)")
print("Is spot (0, 10) available? \(parkingLot.map[0][10].isAvailable)")
*/
