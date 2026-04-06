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
    static let roadWidth: CGFloat = 56
    static let asphaltColor = Color(red: 0.18, green: 0.18, blue: 0.20)
    static let lineColor = Color(red: 0.85, green: 0.85, blue: 0.80)
    static let laneColor = Color(red: 0.22, green: 0.22, blue: 0.24)
    static let handicapBlue = Color(red: 0.2, green: 0.4, blue: 0.9)
    static let spotAvailable = Color(red: 0.2, green: 0.75, blue: 0.3)
    static let spotOccupied = Color(red: 0.85, green: 0.15, blue: 0.15)
    static let hatchYellow = Color(red: 0.83, green: 0.63, blue: 0.09)
    static let grassColor = Color(red: 0.18, green: 0.35, blue: 0.12)
    static let roadColor = Color(red: 0.22, green: 0.22, blue: 0.24)
}

// MARK: - Lane Type

enum LaneType {
    case lane, road, grass
}

// MARK: - Occupancy Trend

enum OccupancyTrend {
    case rising, falling, steady

    var icon: String {
        switch self {
        case .rising: return "arrow.up.right"
        case .falling: return "arrow.down.right"
        case .steady: return "arrow.right"
        }
    }

    var color: Color {
        switch self {
        case .rising: return .red
        case .falling: return .green
        case .steady: return .secondary
        }
    }

    var description: String {
        switch self {
        case .rising: return "Occupancy is increasing"
        case .falling: return "Occupancy is decreasing"
        case .steady: return "Occupancy is steady"
        }
    }
}

// MARK: - Parking Lot Detail View

struct ParkingLotDetailView: View {
    @EnvironmentObject var appSettings: AppSettings
    @EnvironmentObject var parkingLot: ParkingLotViewModel
    @EnvironmentObject var favoritesManager: FavoritesManager
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
    @State private var selectedSpotNumber: Int? = nil

    var body: some View {
        ZStack {
            mapLayer
            overlayLayer

            if isSearching {
                searchOverlay
            }
        }
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
        .onChange(of: appSettings.navigateToSpot) { _, newValue in
            if let spotNum = newValue {
                navigateToSpot(spotNum)
                appSettings.navigateToSpot = nil
            }
        }
        .onAppear {
            if appSettings.shouldResetParkingData {
                resetView()
                appSettings.shouldResetParkingData = false
            }
        }
        .sheet(item: Binding<SpotSelection?>(
            get: {
                if let num = selectedSpotNumber,
                   let pos = ParkingLotMap.position(forSpotNumber: num) {
                    return SpotSelection(
                        spotNumber: num,
                        spot: parkingLot.map.map[pos.row][pos.col]
                    )
                }
                return nil
            },
            set: { selection in
                selectedSpotNumber = selection?.spotNumber
            }
        )) { selection in
            SpotDetailSheet(
                spotNumber: selection.spotNumber,
                spot: selection.spot
            )
            .environmentObject(favoritesManager)
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.hidden)
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

    private func navigateToSpot(_ spotNum: Int? = nil) {
        let target = spotNum ?? Int(searchText)
        guard let targetSpot = target,
              let position = ParkingLotMap.position(forSpotNumber: targetSpot) else { return }

        let spotCenter = ParkingLotMap.centerPoint(forRow: position.row, col: position.col)

        let targetScale: CGFloat = 2.5
        let parkingWidth = CGFloat(ParkingLotMap.spotsPerRow) * ParkingLotLayout.spotWidth
        let mapWidth = ParkingLotLayout.roadWidth + parkingWidth + ParkingLotLayout.roadWidth
        let mapHeight = ParkingLotLayout.laneHeight + 14 * ParkingLotLayout.spotHeight + 7 * ParkingLotLayout.laneHeight
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

        selectedSpotNumber = targetSpot
    }

    // MARK: - Map Layer (Full-Screen)

    private var mapLayer: some View {
        GeometryReader { geo in
            let viewCenter = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)

            ParkingLotView(parkingLot: parkingLot, favoritesManager: favoritesManager, onSpotTap: { spotNum in
                selectedSpotNumber = spotNum
            })
                .rotationEffect(currentRotation)
                .scaleEffect(currentScale, anchor: .center)
                .offset(currentOffset)
                .simultaneousGesture(
                    MagnificationGesture()
                        .onChanged { value in
                            isPinching = true
                            let newScale = min(max(lastScale * value, 0.5), 4.0)
                            let delta = newScale / currentScale
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

                Spacer()

                // Connection status indicator
                VStack(spacing: 2) {
                    Circle()
                        .fill(parkingLot.isConnected ? Color.green : Color.red)
                        .frame(width: 10, height: 10)
                    Text(parkingLot.isConnected ? "Live" : "Offline")
                        .font(.system(size: 8, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))
                }
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

                TextField("Spot number (1-308)", text: $searchText)
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

// MARK: - Spot Selection (for sheet binding)

struct SpotSelection: Identifiable {
    let spotNumber: Int
    let spot: ParkingSpot
    var id: Int { spotNumber }
}

// MARK: - Parking Grid View

struct ParkingLotView: View {
    @ObservedObject var parkingLot: ParkingLotViewModel
    @ObservedObject var favoritesManager: FavoritesManager
    var onSpotTap: (Int) -> Void

    // Lane types for each driving lane row index
    static let laneTypes: [Int: LaneType] = [
        0: .grass,
        2: .road,
        5: .lane,
        8: .lane,
        11: .lane,
        14: .lane,
        17: .lane,
        20: .lane,
    ]

    // Grass positions for spot-level rendering
    static let grassPositions: Set<String> = {
        let positions: [(Int, Int)] = [
            (1, 0), (1, 1), (1, 2), (1, 19), (1, 20), (1, 21),
            (3, 0), (3, 1), (3, 2), (3, 19), (3, 20), (3, 21),
        ]
        return Set(positions.map { "\($0.0)-\($0.1)" })
    }()

    static func isGrassPosition(row: Int, col: Int) -> Bool {
        grassPositions.contains("\(row)-\(col)")
    }

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

    let parkingWidth = CGFloat(ParkingLotMap.spotsPerRow) * ParkingLotLayout.spotWidth

    var body: some View {
        HStack(spacing: 0) {
            // Left road column
            Rectangle()
                .fill(ParkingLotLayout.roadColor)
                .frame(width: ParkingLotLayout.roadWidth)

            // Main parking area
            VStack(spacing: 0) {
                // Top grass lane
                DrivingLaneView(laneType: .grass)

                ForEach(aisles.indices, id: \.self) { aisleIndex in
                    let aisle = aisles[aisleIndex]

                    // Top row
                    ParkingRowView(
                        parkingLot: parkingLot,
                        favoritesManager: favoritesManager,
                        rowIndex: aisle.top,
                        facingUp: true,
                        onSpotTap: onSpotTap
                    )

                    // Bottom row
                    if let bottom = aisle.bottom {
                        ParkingRowView(
                            parkingLot: parkingLot,
                            favoritesManager: favoritesManager,
                            rowIndex: bottom,
                            facingUp: false,
                            onSpotTap: onSpotTap
                        )
                    }

                    // Driving lane
                    if let lane = aisle.lane {
                        let laneType = ParkingLotView.laneTypes[lane] ?? .lane
                        DrivingLaneView(laneType: laneType)
                    }
                }
            }
            .background(ParkingLotLayout.asphaltColor)

            // Right road column
            Rectangle()
                .fill(ParkingLotLayout.roadColor)
                .frame(width: ParkingLotLayout.roadWidth)
        }
    }
}

// MARK: - Parking Row View

struct ParkingRowView: View {
    @ObservedObject var parkingLot: ParkingLotViewModel
    @ObservedObject var favoritesManager: FavoritesManager
    let rowIndex: Int
    let facingUp: Bool
    var onSpotTap: (Int) -> Void

    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<ParkingLotMap.spotsPerRow, id: \.self) { col in
                let spotNum = ParkingLotMap.spotNumber(forRow: rowIndex, col: col) ?? 0
                let isGrass = ParkingLotView.isGrassPosition(row: rowIndex, col: col)
                let isFav = favoritesManager.isFavorite(spotNum)
                ParkingSpotView(
                    spot: parkingLot.map.map[rowIndex][col],
                    row: rowIndex,
                    col: col,
                    facingUp: facingUp,
                    spotNumber: spotNum,
                    isGrass: isGrass,
                    isFavorite: isFav
                )
                .onTapGesture {
                    if !isGrass && parkingLot.map.map[rowIndex][col].status != .notASpot {
                        onSpotTap(spotNum)
                    }
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
    let isGrass: Bool
    var isFavorite: Bool = false

    var isUnusable: Bool {
        spot.status == .notASpot && !isGrass
    }

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
            if isGrass {
                // Solid green fill for grass positions
                Rectangle()
                    .fill(ParkingLotLayout.grassColor)
            } else {
                // Base asphalt
                Rectangle()
                    .fill(ParkingLotLayout.asphaltColor)

                // Parking line markings
                ParkingLineOverlay(
                    facingUp: facingUp,
                    isLastColumn: col == ParkingLotMap.spotsPerRow - 1
                )

                if isUnusable {
                    // Yellow diagonal hatching for unusable spots
                    DiagonalHatchPattern()
                        .padding(.horizontal, 3)
                        .padding(.vertical, 4)
                } else if spot.status != .notASpot {
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

                    // Favorite heart overlay
                    if isFavorite {
                        VStack {
                            HStack {
                                Spacer()
                                Image(systemName: "heart.fill")
                                    .font(.system(size: 6))
                                    .foregroundColor(.pink)
                            }
                            Spacer()
                        }
                        .padding(4)
                    }

                    // Live sensor indicator
                    if spot.hasSensor {
                        VStack {
                            Spacer()
                            HStack {
                                Image(systemName: "antenna.radiowaves.left.and.right")
                                    .font(.system(size: 5))
                                    .foregroundColor(.orange)
                                Spacer()
                            }
                        }
                        .padding(4)
                    }

                    // Spot number label
                    Text("\(spotNumber)")
                        .font(.system(size: 7, weight: .semibold, design: .rounded))
                        .foregroundColor(.white.opacity(0.85))
                        .offset(y: facingUp ? -16 : 16)
                }
            }
        }
        .frame(width: ParkingLotLayout.spotWidth, height: ParkingLotLayout.spotHeight)
    }
}

// MARK: - Diagonal Hatch Pattern (Yellow lines for unusable spots)

struct DiagonalHatchPattern: View {
    var body: some View {
        GeometryReader { geo in
            let spacing: CGFloat = 5
            let count = Int((geo.size.width + geo.size.height) / spacing) + 1

            Canvas { context, size in
                for i in 0..<count {
                    let offset = CGFloat(i) * spacing - size.height
                    var path = Path()
                    path.move(to: CGPoint(x: offset, y: size.height))
                    path.addLine(to: CGPoint(x: offset + size.height, y: 0))
                    context.stroke(path, with: .color(ParkingLotLayout.hatchYellow), lineWidth: 1.5)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
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

            // Back edge line
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
    var laneType: LaneType = .lane

    private var bgColor: Color {
        switch laneType {
        case .grass: return ParkingLotLayout.grassColor
        case .road: return ParkingLotLayout.roadColor
        case .lane: return ParkingLotLayout.laneColor
        }
    }

    var body: some View {
        Rectangle()
            .fill(bgColor)
            .frame(
                width: CGFloat(ParkingLotMap.spotsPerRow) * ParkingLotLayout.spotWidth,
                height: ParkingLotLayout.laneHeight
            )
            .overlay(
                Group {
                    if laneType != .grass {
                        DashedCenterLine()
                    }
                }
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
    @Published var isConnected: Bool = false
    @Published var lastSync: Date? = nil

    private let apiService = ParkingAPIService()
    private var pollTimer: Timer?

    // Occupancy history for trend calculation
    private var occupancySnapshots: [(date: Date, percent: Int)] = []

    // Previous map state for notification diffing
    var previousMap: ParkingLotMap? = nil

    // Notification manager reference (set by SpotSenseApp)
    var notificationManager: NotificationManager?
    var favoritesManager: FavoritesManager?

    init() {
        self.map = ParkingLotMap()
        startPolling()
    }

    deinit {
        pollTimer?.invalidate()
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

    var occupancyPercent: Int {
        let total = map.totalSpotCount()
        guard total > 0 else { return 0 }
        return Int(round(Double(map.occupiedSpotCount()) / Double(total) * 100))
    }

    var occupancyTrend: OccupancyTrend {
        guard occupancySnapshots.count >= 2 else { return .steady }
        let fiveMinAgo = Date().addingTimeInterval(-300)
        let recent = occupancySnapshots.last?.percent ?? 0

        // Find snapshot closest to 5 min ago
        if let older = occupancySnapshots.last(where: { $0.date <= fiveMinAgo }) {
            let diff = recent - older.percent
            if diff > 3 { return .rising }
            if diff < -3 { return .falling }
        }
        return .steady
    }

    func reset() {
        map = ParkingLotMap()
        occupancySnapshots = []
        previousMap = nil
        startPolling()
    }

    // MARK: - API Polling

    private func startPolling() {
        pollTimer?.invalidate()
        fetchData()
        pollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            self?.fetchData()
        }
    }

    func fetchData() {
        Task { @MainActor in
            do {
                let response = try await apiService.fetchParkingData()

                // Snapshot previous state for notification diffing
                previousMap = copyMap(map)

                applyAPIResponse(response)
                isConnected = true

                // Record occupancy snapshot
                let percent = occupancyPercent
                occupancySnapshots.append((date: Date(), percent: percent))
                // Keep last 10 minutes of snapshots
                let cutoff = Date().addingTimeInterval(-600)
                occupancySnapshots.removeAll { $0.date < cutoff }

                // Parse lastSync
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                lastSync = formatter.date(from: response.lastSync) ?? Date()

                // Evaluate notifications
                notificationManager?.evaluateChanges(
                    previousMap: previousMap,
                    currentMap: map,
                    favorites: favoritesManager?.favorites ?? [],
                    occupancyPercent: percent
                )
            } catch {
                isConnected = false
            }
        }
    }

    private func applyAPIResponse(_ response: ParkingAPIResponse) {
        // Build a new ParkingLotMap instance so @Published detects the change.
        // Mutating the existing class in-place doesn't trigger SwiftUI re-renders.
        let newMap = copyMap(map)

        for (rowIndex, row) in response.grid.enumerated() {
            for (colIndex, apiSpot) in row.enumerated() {
                guard newMap.isValidPosition(row: rowIndex, col: colIndex) else { continue }
                guard let spotStatus = SpotStatus(rawValue: apiSpot.status) else { continue }
                guard spotStatus != .notASpot else { continue }

                newMap.map[rowIndex][colIndex] = ParkingSpot(
                    status: spotStatus,
                    isHandicap: apiSpot.isHandicap
                )
            }
        }

        // Apply sensor data from the sensors dictionary
        if let sensors = response.sensors {
            for (spotIdStr, sensorData) in sensors {
                guard let spotId = Int(spotIdStr),
                      let pos = ParkingLotMap.position(forSpotNumber: spotId) else { continue }
                newMap.map[pos.row][pos.col].sensorData = sensorData
            }
        }

        // Assigning a new instance triggers @Published → objectWillChange automatically
        self.map = newMap
    }

    private func copyMap(_ source: ParkingLotMap) -> ParkingLotMap {
        let copy = ParkingLotMap()
        for row in 0..<ParkingLotMap.totalRows {
            for col in 0..<ParkingLotMap.spotsPerRow {
                copy.map[row][col] = source.map[row][col]
            }
        }
        return copy
    }
}

#Preview {
    NavigationStack {
        ParkingLotDetailView()
    }
    .environmentObject(AppSettings())
    .environmentObject(ParkingLotViewModel())
    .environmentObject(FavoritesManager())
}
