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
    @EnvironmentObject var appSettings: AppSettings
    @StateObject private var parkingLot = ParkingLotViewModel()
    @State private var isSearching: Bool = false
    @State private var searchText: String = ""
    @State private var currentScale: CGFloat = 1.0
    @State private var lastScale: CGFloat = 1.0
    @State private var currentOffset: CGSize = .zero
    @State private var lastOffset: CGSize = .zero
    @State private var currentRotation: Angle = .zero
    @State private var lastRotation: Angle = .zero
    @State private var pinchCenter: CGPoint? = nil
    @State private var isPinching: Bool = false

    var body: some View {
        ZStack {
            mapLayer
            overlayLayer

            if isSearching {
                searchOverlay
            }
        }
        .navigationTitle("Parking Lot 3")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        isSearching.toggle()
                        if !isSearching { searchText = "" }
                    }
                } label: {
                    Image(systemName: "magnifyingglass")
                }
            }
        }
        .onChange(of: appSettings.shouldResetParkingData) { _, newValue in
            if newValue {
                resetView()
                appSettings.shouldResetParkingData = false
            }
        }
        .onAppear {
            if appSettings.shouldResetParkingData {
                resetView()
                appSettings.shouldResetParkingData = false
            }
        }
    }

    // MARK: - Helpers

    private var isValidSpotNumber: Bool {
        guard let num = Int(searchText) else { return false }
        return num >= 1 && num <= ParkingLotMap.totalNumberedSpots
    }

    private func resetView() {
        parkingLot.reset()
        currentScale = 1.0
        lastScale = 1.0
        currentOffset = .zero
        lastOffset = .zero
        currentRotation = .zero
        lastRotation = .zero
    }

    private func navigateToSpot() {
        guard let spotNum = Int(searchText),
              let position = ParkingLotMap.position(forSpotNumber: spotNum) else { return }

        let spotCenter = ParkingLotMap.centerPoint(forRow: position.row, col: position.col)

        let targetScale: CGFloat = 2.5
        let mapWidth = CGFloat(ParkingLotMap.spotsPerRow) * ParkingLotLayout.spotWidth
        let mapHeight: CGFloat = 10 * ParkingLotLayout.spotHeight + 4 * ParkingLotLayout.laneHeight
        let mapCenter = CGPoint(x: mapWidth / 2, y: mapHeight / 2)

        let targetOffset = CGSize(
            width: -(spotCenter.x - mapCenter.x) * targetScale,
            height: -(spotCenter.y - mapCenter.y) * targetScale
        )

        withAnimation(.easeInOut(duration: 0.5)) {
            currentScale = targetScale
            currentOffset = targetOffset
            currentRotation = .zero
        }

        lastScale = targetScale
        lastOffset = targetOffset
        lastRotation = .zero

        withAnimation(.easeInOut(duration: 0.25)) {
            isSearching = false
            searchText = ""
        }
    }

    // MARK: - Map Layer (Full-Screen)

    private var mapLayer: some View {
        GeometryReader { geo in
            let viewCenter = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)

            ParkingLotView(parkingLot: parkingLot)
                .rotationEffect(currentRotation)
                .scaleEffect(currentScale, anchor: .center)
                .offset(currentOffset)
                .simultaneousGesture(
                    MagnificationGesture()
                        .onChanged { value in
                            isPinching = true
                            let newScale = min(max(lastScale * value, 0.5), 4.0)
                            let delta = newScale / currentScale
                            // Use pinch location if available, otherwise zoom from center
                            let anchor = pinchCenter ?? viewCenter
                            let anchorOffset = CGSize(
                                width: anchor.x - viewCenter.x,
                                height: anchor.y - viewCenter.y
                            )
                            currentOffset = CGSize(
                                width: anchorOffset.width * (1 - delta) + currentOffset.width * delta,
                                height: anchorOffset.height * (1 - delta) + currentOffset.height * delta
                            )
                            currentScale = newScale
                        }
                        .onEnded { _ in
                            isPinching = false
                            pinchCenter = nil
                            lastScale = currentScale
                            lastOffset = currentOffset
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
                            pinchCenter = value.startLocation
                            if !isPinching {
                                currentOffset = CGSize(
                                    width: lastOffset.width + value.translation.width,
                                    height: lastOffset.height + value.translation.height
                                )
                            }
                        }
                        .onEnded { _ in
                            if !isPinching {
                                lastOffset = currentOffset
                            }
                        }
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(ParkingLotLayout.asphaltColor)
        .ignoresSafeArea(edges: .bottom)
    }

    // MARK: - Overlay Layer (Floating UI)

    private var overlayLayer: some View {
        VStack {
            HStack(spacing: 12) {
                StatCircle(value: parkingLot.availableCount, color: ParkingLotLayout.spotAvailable, icon: "car.fill")
                StatCircle(value: parkingLot.occupiedCount, color: ParkingLotLayout.spotOccupied, icon: "car.fill")
                StatCircle(value: parkingLot.handicapAvailableCount, color: ParkingLotLayout.handicapBlue, icon: "figure.roll")
            }
            .padding(.top, 8)

            Spacer()
        }
        .padding(.horizontal)
    }

    // MARK: - Search Overlay

    private var searchOverlay: some View {
        VStack {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.secondary)

                TextField("Spot number (1-220)", text: $searchText)
                    .keyboardType(.numberPad)
                    .textFieldStyle(.plain)

                if !searchText.isEmpty {
                    Button {
                        navigateToSpot()
                    } label: {
                        Text("Go")
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(isValidSpotNumber ? Color.blue : Color.gray)
                            .cornerRadius(8)
                    }
                    .disabled(!isValidSpotNumber)
                }

                Button {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        isSearching = false
                        searchText = ""
                    }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
            .padding(12)
            .background(.ultraThinMaterial)
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
            .padding(.horizontal)
            .padding(.top, 8)

            Spacer()
        }
        .transition(.move(edge: .top).combined(with: .opacity))
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
                let spotNum = ParkingLotMap.spotNumber(forRow: rowIndex, col: col) ?? 0
                ParkingSpotView(
                    spot: parkingLot.map.map[rowIndex][col],
                    row: rowIndex,
                    col: col,
                    facingUp: facingUp,
                    spotNumber: spotNum
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
    let spotNumber: Int

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

            // Spot number label
            Text("\(spotNumber)")
                .font(.system(size: 7, weight: .semibold, design: .rounded))
                .foregroundColor(.white.opacity(0.85))
                .offset(y: facingUp ? -16 : 16)
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

// MARK: - Stat Circle

struct StatCircle: View {
    let value: Int
    let color: Color
    let icon: String

    var body: some View {
        VStack(spacing: 2) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.85))
                    .frame(width: 52, height: 52)
                    .shadow(color: .black.opacity(0.3), radius: 4, y: 2)

                Text("\(value)")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }

            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundColor(color)
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
    .environmentObject(AppSettings())
}
