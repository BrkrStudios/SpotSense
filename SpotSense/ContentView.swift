//
//  ContentView.swift
//  SpotSense
//
//  Created by Xander Angulo on 2/4/26.
//

import SwiftUI
import Combine

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

                // Parking Lot Grid
                ScrollView([.horizontal, .vertical], showsIndicators: true) {
                    VStack(spacing: 2) {
                        ForEach(0..<parkingLot.map.map.count, id: \.self) { row in
                            HStack(spacing: 2) {
                                ForEach(0..<parkingLot.map.map[row].count, id: \.self) { col in
                                    SpotView(spot: parkingLot.map.map[row][col], row: row, col: col)
                                        .onTapGesture {
                                            parkingLot.toggleSpot(row: row, col: col)
                                        }
                                }
                            }
                        }
                    }
                    .padding()
                }
                .background(Color(.systemGray6))
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

// MARK: - Spot View
struct SpotView: View {
    let spot: ParkingSpot
    let row: Int
    let col: Int

    var body: some View {
        Rectangle()
            .fill(spotColor)
            .frame(width: 16, height: 16)
            .cornerRadius(2)
            .overlay(
                Group {
                    if spot.isHandicap && spot.status != .notASpot {
                        Image(systemName: "figure.roll")
                            .font(.system(size: 8))
                            .foregroundColor(.white)
                    }
                }
            )
    }

    var spotColor: Color {
        switch spot.status {
        case .occupied:
            return spot.isHandicap ? .purple : .red
        case .available:
            return .green
        case .notASpot:
            return Color(.systemGray4)
        case .handicap:
            return .blue
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
            LegendItem(color: .green, label: "Available")
            LegendItem(color: .red, label: "Occupied")
            LegendItem(color: .blue, label: "Handicap")
            LegendItem(color: Color(.systemGray4), label: "Lane")
        }
        .font(.caption)
    }
}

struct LegendItem: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            Rectangle()
                .fill(color)
                .frame(width: 12, height: 12)
                .cornerRadius(2)
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
