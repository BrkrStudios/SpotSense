//
//  DashboardView.swift
//  SpotSense
//
//  User-facing dashboard: occupancy overview, favorites summary, trend.
//

import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var parkingLot: ParkingLotViewModel
    @EnvironmentObject var favoritesManager: FavoritesManager
    @EnvironmentObject var appSettings: AppSettings

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Connection status
                    HStack {
                        Circle()
                            .fill(parkingLot.isConnected ? Color.green : Color.red)
                            .frame(width: 8, height: 8)
                        Text(parkingLot.isConnected ? "Live" : "Offline")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("Parking Lot 3")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)

                    // Occupancy ring
                    occupancyRing

                    // Quick stats row
                    statsRow

                    // Favorites summary
                    if !favoritesManager.favorites.isEmpty {
                        favoritesSummary
                    }

                    // Trend card
                    trendCard

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
        let color: Color = percent > 85 ? .red : percent > 60 ? .orange : .green

        return VStack(spacing: 8) {
            ZStack {
                Circle()
                    .stroke(color.opacity(0.15), lineWidth: 16)
                    .frame(width: 160, height: 160)

                Circle()
                    .trim(from: 0, to: CGFloat(percent) / 100)
                    .stroke(color, style: StrokeStyle(lineWidth: 16, lineCap: .round))
                    .frame(width: 160, height: 160)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.6), value: percent)

                VStack(spacing: 2) {
                    Text("\(percent)%")
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                    Text("Occupied")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
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
                icon: "xmark.circle.fill",
                color: .red
            )
            DashboardStatCard(
                title: "Handicap",
                value: "\(parkingLot.handicapAvailableCount)",
                icon: "figure.roll",
                color: .blue
            )
        }
        .padding(.horizontal)
    }

    // MARK: - Favorites Summary

    private var favoritesSummary: some View {
        let total = favoritesManager.favorites.count
        let available = favoritesManager.availableFavoritesCount(in: parkingLot.map)

        return HStack {
            Image(systemName: "heart.fill")
                .foregroundColor(.pink)
            VStack(alignment: .leading, spacing: 2) {
                Text("Your Favorites")
                    .font(.subheadline.weight(.semibold))
                Text("\(available) of \(total) available")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Text("\(available)/\(total)")
                .font(.title2.weight(.bold).monospacedDigit())
                .foregroundColor(available > 0 ? .green : .red)
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(14)
        .padding(.horizontal)
    }

    // MARK: - Trend Card

    private var trendCard: some View {
        let trend = parkingLot.occupancyTrend

        return HStack {
            Image(systemName: trend.icon)
                .font(.title2)
                .foregroundColor(trend.color)
            VStack(alignment: .leading, spacing: 2) {
                Text("Trend")
                    .font(.subheadline.weight(.semibold))
                Text(trend.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            if let lastSync = parkingLot.lastSync {
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Last Update")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(lastSync, style: .time)
                        .font(.caption.monospacedDigit())
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(14)
        .padding(.horizontal)
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
        .cornerRadius(14)
    }
}

#Preview {
    DashboardView()
        .environmentObject(ParkingLotViewModel())
        .environmentObject(FavoritesManager())
        .environmentObject(AppSettings())
}
