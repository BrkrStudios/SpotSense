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
    static let spotAvailable = Color(red: 0.2, green: 0.75, blue: 0.3)
    static let spotOccupied = Color(red: 0.85, green: 0.15, blue: 0.15)
}

// MARK: - Parking Lot Detail View

struct ParkingLotDetailView: View {
    @StateObject private var parkingLot = ParkingLotViewModel()
    @State private var currentScale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var currentOffset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var scaleAnchor: UnitPoint = .center
    @State private var isPinching: Bool = false
    @State private var currentRotation: Angle = .zero
    @State private var lastRotation: Angle = .zero

    var body: some View {
        VStack(spacing: 16) {
            // Stats Header
            HStack(spacing: 20) {
                StatCard(title: "Available", value: "\(parkingLot.availableCount)", color: .green)
                StatCard(title: "Occupied", value: "\(parkingLot.occupiedCount)", color: .red)
                StatCard(title: "Handicap", value: "\(parkingLot.handicapAvailableCount)", color: .blue)
            }
            .padding(.horizontal)

            // Parking Lot - Zoomable, Pannable & Rotatable
            GeometryReader { geo in
                ParkingLotView(parkingLot: parkingLot)
                    .padding(12)
                    .rotationEffect(currentRotation)
                    .scaleEffect(currentScale, anchor: scaleAnchor)
                    .offset(currentOffset)
                    .gesture(
                        MagnificationGesture()
                            .onChanged { value in
                                isPinching = true
                                let newScale = lastScale * value
                                currentScale = min(max(newScale, 0.5), 4.0)
                            }
                            .onEnded { value in
                                lastScale = currentScale
                                isPinching = false
                            }
                    )
                    .simultaneousGesture(
                        RotationGesture()
                            .onChanged { angle in
                                currentRotation = lastRotation + angle
                            }
                            .onEnded { angle in
                                lastRotation = currentRotation
                            }
                    )
                    .simultaneousGesture(
                        DragGesture()
                            .onChanged { value in
                                if isPinching {
                                    // While pinching, update anchor instead of panning
                                    scaleAnchor = UnitPoint(
                                        x: value.startLocation.x / geo.size.width,
                                        y: value.startLocation.y / geo.size.height
                                    )
                                } else {
                                    currentOffset = CGSize(
                                        width: lastOffset.width + value.translation.width,
                                        height: lastOffset.height + value.translation.height
                                    )
                                }
                            }
                            .onEnded { value in
                                if !isPinching {
                                    lastOffset = currentOffset
                                }
                            }
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(Color.black)
            .clipped()
            .cornerRadius(12)
            .padding(.horizontal)

            // Legend
            LegendView()
                .padding(.horizontal)

            Spacer()
        }
        .navigationTitle("Parking Lot 3")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Reset") {
                    parkingLot.reset()
                    currentScale = 1.0
                    lastScale = 1.0
                    currentOffset = .zero
                    lastOffset = .zero
                    scaleAnchor = .center
                    currentRotation = .zero
                    lastRotation = .zero
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

    var indicatorColor: Color {
        if spot.status == .occupied {
            return ParkingLotLayout.spotOccupied
        } else if spot.isHandicap {
            return ParkingLotLayout.handicapBlue
        } else {
            return ParkingLotLayout.spotAvailable
        }
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

            // Spot status indicator
            RoundedRectangle(cornerRadius: 4)
                .fill(indicatorColor)
                .padding(.horizontal, 3)
                .padding(.vertical, 4)

            // Handicap icon overlay
            if spot.isHandicap {
                Image(systemName: "figure.roll")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
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
            LegendItem(color: ParkingLotLayout.spotAvailable, label: "Available")
            LegendItem(color: ParkingLotLayout.spotOccupied, label: "Occupied")
            LegendItem(color: ParkingLotLayout.handicapBlue, label: "Handicap")
            LegendItem(color: ParkingLotLayout.laneColor, label: "Lane")
        }
        .font(.caption)
    }
}

struct LegendItem: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 3)
                .fill(color)
                .frame(width: 12, height: 12)
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
    NavigationStack {
        ParkingLotDetailView()
    }
}
