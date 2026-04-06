//
//  FavoritesView.swift
//  SpotSense
//
//  List of favorited parking spots with live status.
//

import SwiftUI

struct FavoritesView: View {
    @EnvironmentObject var parkingLot: ParkingLotViewModel
    @EnvironmentObject var favoritesManager: FavoritesManager
    @EnvironmentObject var appSettings: AppSettings

    private var sortedFavorites: [Int] {
        favoritesManager.favorites.sorted()
    }

    var body: some View {
        NavigationStack {
            Group {
                if sortedFavorites.isEmpty {
                    emptyState
                } else {
                    favoritesList
                }
            }
            .navigationBarHidden(true)
            .scrollContentBackground(appSettings.theme.needsCustomBackground ? .hidden : .visible)
            .background(appSettings.theme.backgroundColor ?? Color.clear)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "heart.slash")
                .font(.system(size: 48))
                .foregroundColor(.secondary.opacity(0.5))
            Text("No Favorites Yet")
                .font(.title3.weight(.semibold))
            Text("Tap any spot on the map to add it to your favorites.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Favorites List

    private var favoritesList: some View {
        List {
            ForEach(sortedFavorites, id: \.self) { spotNum in
                let spotInfo = spotDetails(spotNum)

                HStack(spacing: 14) {
                    // Status dot
                    Circle()
                        .fill(spotInfo.isAvailable ? Color.green : Color.red)
                        .frame(width: 12, height: 12)

                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text("Spot \(spotNum)")
                                .font(.body.weight(.semibold))

                            if spotInfo.isHandicap {
                                Image(systemName: "figure.roll")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                            }

                            if spotInfo.hasSensor {
                                Image(systemName: "antenna.radiowaves.left.and.right")
                                    .font(.caption2)
                                    .foregroundColor(.orange)
                            }
                        }

                        Text("Section \(spotInfo.section)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    Text(spotInfo.isAvailable ? "Available" : "Occupied")
                        .font(.caption.weight(.medium))
                        .foregroundColor(spotInfo.isAvailable ? .green : .red)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(
                            (spotInfo.isAvailable ? Color.green : Color.red).opacity(0.12)
                        )
                        .cornerRadius(8)
                }
                .padding(.vertical, 4)
                .contentShape(Rectangle())
                .onTapGesture {
                    appSettings.navigateToSpot = spotNum
                    appSettings.selectedTab = 1
                }
            }
            .onDelete { indexSet in
                for idx in indexSet {
                    let spotNum = sortedFavorites[idx]
                    favoritesManager.toggle(spotNum)
                }
            }
        }
    }

    // MARK: - Helpers

    private struct SpotInfo {
        let isAvailable: Bool
        let isHandicap: Bool
        let hasSensor: Bool
        let section: String
    }

    private func spotDetails(_ spotNum: Int) -> SpotInfo {
        guard let pos = ParkingLotMap.position(forSpotNumber: spotNum) else {
            return SpotInfo(isAvailable: false, isHandicap: false, hasSensor: false, section: "?")
        }
        let spot = parkingLot.map.map[pos.row][pos.col]
        let section = LotSection.section(forSpotNumber: spotNum)?.rawValue ?? "?"
        return SpotInfo(
            isAvailable: spot.isAvailable,
            isHandicap: spot.isHandicap,
            hasSensor: spot.hasSensor,
            section: section
        )
    }
}

#Preview {
    FavoritesView()
        .environmentObject(ParkingLotViewModel())
        .environmentObject(FavoritesManager())
        .environmentObject(AppSettings())
}
