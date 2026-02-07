//
//  ContentView.swift
//  SpotSense
//
//  Created by Xander Angulo on 2/4/26.
//

import SwiftUI
import Combine

// MARK: - Layout Constants

enum ParkingLotLayout {
    static let spotWidth: CGFloat = 28
    static let spotHeight: CGFloat = 48
    static let lineWidth: CGFloat = 1.5
    static let laneHeight: CGFloat = 56
    static let asphaltColor = Color(red: 0.18, green: 0.18, blue: 0.20)
    static let lineColor = Color(red: 0.85, green: 0.85, blue: 0.80)
    static let laneColor = Color(red: 0.22, green: 0.22, blue: 0.24)
    static let handicapBlue = Color(red: 0.2, green: 0.4, blue: 0.9)
    static let carColors: [Color] = [
        Color(red: 0.8, green: 0.1, blue: 0.1),   // red
        Color(red: 0.2, green: 0.2, blue: 0.7),   // blue
        Color(red: 0.6, green: 0.6, blue: 0.6),   // silver
        Color(red: 0.1, green: 0.1, blue: 0.1),   // black
        Color(red: 0.9, green: 0.9, blue: 0.85),  // white
    ]
}

// MARK: - Content View

struct ContentView: View {
    @StateObject private var parkingLot = ParkingLotViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                // Stats Header
                HStack(spacing: 20) {
                    StatCard(title: "Available", value: "\(parkingLot.availableCount)", color: .green)
                    StatCard(title: "Occupied", value: "\(parkingLot.occupiedCount)", color: .red)
                    StatCard(title: "Handicap", value: "\(parkingLot.handicapAvailableCount)", color: .blue)
                }
                .padding(.horizontal)

                // Parking Lot
                ScrollView([.horizontal, .vertical], showsIndicators: true) {
                    ParkingLotView(parkingLot: parkingLot)
                        .padding(12)
                }
                .background(Color.black)
                .cornerRadius(12)
                .padding(.horizontal)

                // Legend
                LegendView()
                    .padding(.horizontal)

                Spacer()
            }
            .navigationTitle("SpotSense")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Reset") {
                        parkingLot.reset()
                    }
                }
            }
        }
    }
}

// MARK: - Parking Lot View

struct ParkingLotView: View {
    @ObservedObject var parkingLot: ParkingLotViewModel

    // 5 aisles: (topRow, bottomRow, laneRow?)
    let aisles: [(top: Int, bottom: Int, lane: Int?)] = [
        (0, 1, 2),
        (3, 4, 5),
        (6, 7, 8),
        (9, 10, 11),
        (12, 13, nil)
    ]

    var body: some View {
        VStack(spacing: 0) {
            ForEach(aisles.indices, id: \.self) { aisleIndex in
                let aisle = aisles[aisleIndex]

                // Top row of spots (facing up — open toward top, lines at bottom)
                ParkingRowView(
                    parkingLot: parkingLot,
                    rowIndex: aisle.top,
                    facingUp: true
                )

                // Bottom row of spots (facing down — open toward bottom, lines at top)
                ParkingRowView(
                    parkingLot: parkingLot,
                    rowIndex: aisle.bottom,
                    facingUp: false
                )

                // Driving lane (if present)
                if aisle.lane != nil {
                    DrivingLaneView()
                }
            }
        }
        .background(ParkingLotLayout.asphaltColor)
    }
}

// MARK: - Parking Row View

struct ParkingRowView: View {
    @ObservedObject var parkingLot: ParkingLotViewModel
    let rowIndex: Int
    let facingUp: Bool

    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<ParkingLotMap.spotsPerRow, id: \.self) { col in
                ParkingSpotView(
                    spot: parkingLot.map.map[rowIndex][col],
                    row: rowIndex,
                    col: col,
                    facingUp: facingUp
                )
                .onTapGesture {
                    parkingLot.toggleSpot(row: rowIndex, col: col)
                }
            }
        }
    }
}

// MARK: - Parking Spot View

struct ParkingSpotView: View {
    let spot: ParkingSpot
    let row: Int
    let col: Int
    let facingUp: Bool

    var carColor: Color {
        let hash = (row &* 31 &+ col &* 17) % ParkingLotLayout.carColors.count
        return ParkingLotLayout.carColors[abs(hash)]
    }

    var body: some View {
        ZStack {
            // Base asphalt
            Rectangle()
                .fill(ParkingLotLayout.asphaltColor)

            // Parking line markings
            ParkingLineOverlay(
                facingUp: facingUp,
                isLastColumn: col == ParkingLotMap.spotsPerRow - 1
            )

            // Handicap floor marking (visible when empty)
            if spot.isHandicap && spot.status != .occupied {
                HandicapFloorMarkingView()
            }

            // Car shape when occupied
            if spot.status == .occupied {
                CarShapeView(color: carColor, facingUp: facingUp, isHandicap: spot.isHandicap)
            }
        }
        .frame(width: ParkingLotLayout.spotWidth, height: ParkingLotLayout.spotHeight)
    }
}

// MARK: - Parking Line Overlay

struct ParkingLineOverlay: View {
    let facingUp: Bool
    let isLastColumn: Bool

    var body: some View {
        ZStack {
            // Left edge line (always)
            HStack {
                Rectangle()
                    .fill(ParkingLotLayout.lineColor)
                    .frame(width: ParkingLotLayout.lineWidth)
                Spacer(minLength: 0)
            }

            // Right edge line (only on last column)
            if isLastColumn {
                HStack {
                    Spacer(minLength: 0)
                    Rectangle()
                        .fill(ParkingLotLayout.lineColor)
                        .frame(width: ParkingLotLayout.lineWidth)
                }
            }

            // Back edge line (shared median between paired rows)
            // Only draw on facingUp rows to avoid double-thickness
            if facingUp {
                VStack {
                    Spacer(minLength: 0)
                    Rectangle()
                        .fill(ParkingLotLayout.lineColor)
                        .frame(height: ParkingLotLayout.lineWidth)
                }
            } else {
                VStack {
                    Rectangle()
                        .fill(ParkingLotLayout.lineColor)
                        .frame(height: ParkingLotLayout.lineWidth)
                    Spacer(minLength: 0)
                }
            }
        }
    }
}

// MARK: - Car Shape View

struct CarShapeView: View {
    let color: Color
    let facingUp: Bool
    let isHandicap: Bool

    private let inset: CGFloat = 4

    var body: some View {
        ZStack {
            // Car body
            RoundedRectangle(cornerRadius: 4)
                .fill(color)
                .padding(.horizontal, inset)
                .padding(.vertical, inset + 2)

            // Windshield (darker area at front of car)
            VStack(spacing: 0) {
                if facingUp {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color(white: 0.3, opacity: 0.6))
                        .frame(height: 8)
                        .padding(.horizontal, inset + 3)
                        .padding(.top, inset + 3)
                    Spacer(minLength: 0)
                } else {
                    Spacer(minLength: 0)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color(white: 0.3, opacity: 0.6))
                        .frame(height: 8)
                        .padding(.horizontal, inset + 3)
                        .padding(.bottom, inset + 3)
                }
            }

            // Handicap placard indicator
            if isHandicap {
                VStack(spacing: 0) {
                    if facingUp {
                        Spacer(minLength: 0)
                        Image(systemName: "figure.roll")
                            .font(.system(size: 8))
                            .foregroundColor(.white)
                            .padding(.bottom, inset + 4)
                    } else {
                        Image(systemName: "figure.roll")
                            .font(.system(size: 8))
                            .foregroundColor(.white)
                            .padding(.top, inset + 4)
                        Spacer(minLength: 0)
                    }
                }
            }
        }
    }
}

// MARK: - Handicap Floor Marking View

struct HandicapFloorMarkingView: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 2)
                .fill(ParkingLotLayout.handicapBlue.opacity(0.5))
                .padding(6)

            Image(systemName: "figure.roll")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Driving Lane View

struct DrivingLaneView: View {
    var body: some View {
        Rectangle()
            .fill(ParkingLotLayout.laneColor)
            .frame(
                width: CGFloat(ParkingLotMap.spotsPerRow) * ParkingLotLayout.spotWidth,
                height: ParkingLotLayout.laneHeight
            )
            .overlay(
                DashedCenterLine()
            )
    }
}

// MARK: - Dashed Center Line

struct DashedCenterLine: View {
    var body: some View {
        GeometryReader { geo in
            Path { path in
                let y = geo.size.height / 2
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: geo.size.width, y: y))
            }
            .stroke(
                ParkingLotLayout.lineColor.opacity(0.3),
                style: StrokeStyle(lineWidth: 1, dash: [8, 8])
            )
        }
    }
}

// MARK: - Stat Card

struct StatCard: View {
    let title: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Legend View

struct LegendView: View {
    var body: some View {
        HStack(spacing: 16) {
            LegendItem(color: ParkingLotLayout.asphaltColor, label: "Available", showLines: true)
            LegendItem(color: .red, label: "Occupied", isCar: true)
            LegendItem(color: ParkingLotLayout.handicapBlue, label: "Handicap")
            LegendItem(color: ParkingLotLayout.laneColor, label: "Lane")
        }
        .font(.caption)
    }
}

struct LegendItem: View {
    let color: Color
    let label: String
    var showLines: Bool = false
    var isCar: Bool = false

    var body: some View {
        HStack(spacing: 4) {
            if isCar {
                // Show a tiny car shape
                RoundedRectangle(cornerRadius: 2)
                    .fill(color)
                    .frame(width: 10, height: 14)
                    .overlay(
                        RoundedRectangle(cornerRadius: 2)
                            .stroke(Color.white.opacity(0.3), lineWidth: 0.5)
                    )
            } else if showLines {
                // Show asphalt with parking lines
                ZStack {
                    Rectangle()
                        .fill(color)
                        .frame(width: 14, height: 14)
                    HStack(spacing: 0) {
                        Rectangle()
                            .fill(ParkingLotLayout.lineColor)
                            .frame(width: 1)
                        Spacer(minLength: 0)
                        Rectangle()
                            .fill(ParkingLotLayout.lineColor)
                            .frame(width: 1)
                    }
                    .frame(width: 14, height: 14)
                }
            } else {
                Rectangle()
                    .fill(color)
                    .frame(width: 12, height: 12)
                    .cornerRadius(2)
            }
            Text(label)
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - ViewModel

class ParkingLotViewModel: ObservableObject {
    @Published var map: ParkingLotMap

    init() {
        self.map = ParkingLotMap()
    }

    var availableCount: Int {
        map.availableSpotCount()
    }

    var occupiedCount: Int {
        map.occupiedSpotCount()
    }

    var handicapAvailableCount: Int {
        map.availableHandicapSpotCount()
    }

    func toggleSpot(row: Int, col: Int) {
        guard map.isValidPosition(row: row, col: col) else { return }
        guard map.map[row][col].status != .notASpot else { return }

        if map.map[row][col].status == .occupied {
            _ = map.removeCar(row: row, col: col)
        } else {
            _ = map.parkCar(row: row, col: col)
        }

        // Trigger UI update
        objectWillChange.send()
    }

    func reset() {
        map = ParkingLotMap()
    }
}

#Preview {
    ContentView()
}
