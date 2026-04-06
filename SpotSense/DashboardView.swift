//
//  DashboardView.swift
//  SpotSense
//
//  User-facing dashboard: occupancy overview, favorites summary, quick stats.
//

import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var parkingLot: ParkingLotViewModel
    @EnvironmentObject var favoritesManager: FavoritesManager
    @EnvironmentObject var appSettings: AppSettings

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: appSettings.compactDashboard ? 14 : 20) {
                    // Occupancy ring — always shown
                    occupancyRing

                    // Quick stats row
                    statsRow

                    // Favorites summary
                    if appSettings.showFavoritesOnDashboard && !favoritesManager.favorites.isEmpty {
                        favoritesSummary
                    }

                    // Section breakdown
                    if !appSettings.compactDashboard {
                        sectionBreakdown
                    }

                    // Last sync
                    if appSettings.showLastSync, let lastSync = parkingLot.lastSync {
                        lastSyncCard(lastSync)
                    }

                    Spacer(minLength: 40)
                }
                .padding(.top, 8)
            }
            .navigationBarHidden(true)
            .scrollContentBackground(appSettings.theme.needsCustomBackground ? .hidden : .visible)
            .background(appSettings.theme.backgroundColor ?? Color.clear)
        }
    }

    // MARK: - Occupancy Ring

    private var occupancyRing: some View {
        let percent = parkingLot.occupancyPercent
        let available = parkingLot.availableCount
        let total = parkingLot.map.totalSpotCount()
        let color: Color = percent > 85 ? .red : percent > 60 ? .orange : .green

        return VStack(spacing: 12) {
            ZStack {
                // Track
                Circle()
                    .stroke(color.opacity(0.12), lineWidth: 18)
                    .frame(width: 170, height: 170)

                // Fill
                Circle()
                    .trim(from: 0, to: CGFloat(percent) / 100)
                    .stroke(
                        AngularGradient(
                            colors: [color.opacity(0.7), color],
                            center: .center,
                            startAngle: .degrees(0),
                            endAngle: .degrees(360)
                        ),
                        style: StrokeStyle(lineWidth: 18, lineCap: .round)
                    )
                    .frame(width: 170, height: 170)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.6), value: percent)

                // Center text
                VStack(spacing: 2) {
                    Text("\(percent)%")
                        .font(.system(size: 42, weight: .bold, design: .rounded))
                    Text("Occupied")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Sub-label
            Text("\(available) of \(total) spots available")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
    }

    // MARK: - Stats Row

    private var statsRow: some View {
        HStack(spacing: 12) {
            DashboardStatCard(
                title: "Available",
                value: "\(parkingLot.availableCount)",
                icon: "car.fill",
                color: .green
            )
            DashboardStatCard(
                title: "Occupied",
                value: "\(parkingLot.occupiedCount)",
                icon: "car.side.fill",
                color: .red
            )
            if appSettings.showHandicapIndicator {
                DashboardStatCard(
                    title: "Handicap",
                    value: "\(parkingLot.handicapAvailableCount)",
                    icon: "figure.roll",
                    color: .blue
                )
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Favorites Summary

    private var favoritesSummary: some View {
        let total = favoritesManager.favorites.count
        let available = favoritesManager.availableFavoritesCount(in: parkingLot.map)
        let color: Color = available > 0 ? .green : .red

        return HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.pink.opacity(0.12))
                    .frame(width: 44, height: 44)
                Image(systemName: "heart.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.pink)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text("Your Favorites")
                    .font(.subheadline.weight(.semibold))
                Text("\(available) of \(total) available")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Text("\(available)/\(total)")
                .font(.title2.weight(.bold).monospacedDigit())
                .foregroundColor(color)
        }
        .padding(16)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal)
    }

    // MARK: - Section Breakdown

    private var sectionBreakdown: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("BY SECTION")
                .font(.caption.weight(.semibold))
                .foregroundColor(.secondary)
                .padding(.leading, 4)

            VStack(spacing: 6) {
                ForEach(LotSection.allCases, id: \.self) { section in
                    let stats = sectionStats(section)
                    SectionBarRow(
                        name: section.rawValue,
                        available: stats.available,
                        total: stats.total
                    )
                }
            }
            .padding(14)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
        .padding(.horizontal)
    }

    private func sectionStats(_ section: LotSection) -> (available: Int, total: Int) {
        var available = 0
        var total = 0
        for spotNum in section.spotRange {
            guard let pos = ParkingLotMap.position(forSpotNumber: spotNum) else { continue }
            let spot = parkingLot.map.map[pos.row][pos.col]
            guard spot.status != .notASpot else { continue }
            total += 1
            if spot.isAvailable { available += 1 }
        }
        return (available, total)
    }

    // MARK: - Last Sync

    private func lastSyncCard(_ date: Date) -> some View {
        HStack(spacing: 10) {
            Image(systemName: "antenna.radiowaves.left.and.right")
                .font(.caption)
                .foregroundColor(parkingLot.isConnected ? .green : .red)

            Text(parkingLot.isConnected ? "Connected" : "Offline")
                .font(.caption.weight(.medium))
                .foregroundColor(parkingLot.isConnected ? .green : .red)

            Spacer()

            Text("Updated ")
                .font(.caption2)
                .foregroundColor(.secondary)
            +
            Text(date, style: .relative)
                .font(.caption2)
                .foregroundColor(.secondary)
            +
            Text(" ago")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

// MARK: - Section Bar Row

struct SectionBarRow: View {
    let name: String
    let available: Int
    let total: Int

    private var fillPercent: CGFloat {
        guard total > 0 else { return 0 }
        return CGFloat(total - available) / CGFloat(total)
    }

    private var barColor: Color {
        let pct = fillPercent
        if pct > 0.85 { return .red }
        if pct > 0.6 { return .orange }
        return .green
    }

    var body: some View {
        HStack(spacing: 10) {
            Text(name)
                .font(.caption.weight(.medium))
                .frame(width: 70, alignment: .leading)
                .lineLimit(1)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(barColor.opacity(0.15))
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 3)
                        .fill(barColor.gradient)
                        .frame(width: geo.size.width * fillPercent, height: 8)
                        .animation(.easeInOut(duration: 0.4), value: fillPercent)
                }
            }
            .frame(height: 8)

            Text("\(available)")
                .font(.caption.weight(.semibold).monospacedDigit())
                .foregroundColor(available > 0 ? .green : .red)
                .frame(width: 24, alignment: .trailing)
        }
    }
}

// MARK: - Dashboard Stat Card

struct DashboardStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)

            Text(value)
                .font(.title.weight(.bold).monospacedDigit())

            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    DashboardView()
        .environmentObject(ParkingLotViewModel())
        .environmentObject(FavoritesManager())
        .environmentObject(AppSettings())
}
