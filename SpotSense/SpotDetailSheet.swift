//
//  SpotDetailSheet.swift
//  SpotSense
//
//  Bottom sheet shown when a user taps a parking spot on the map.
//

import SwiftUI

struct SpotDetailSheet: View {
    let spotNumber: Int
    let spot: ParkingSpot
    @EnvironmentObject var favoritesManager: FavoritesManager
    @State private var animateIn = false

    private var section: String {
        LotSection.section(forSpotNumber: spotNumber)?.rawValue ?? "?"
    }

    private var isFavorite: Bool {
        favoritesManager.isFavorite(spotNumber)
    }

    private var statusColor: Color {
        spot.isAvailable ? .green : .red
    }

    var body: some View {
        VStack(spacing: 0) {
            // Handle bar
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.secondary.opacity(0.4))
                .frame(width: 40, height: 5)
                .padding(.top, 10)
                .padding(.bottom, 20)

            VStack(spacing: 24) {
                // Top: big status badge + spot info
                headerCard

                // Info grid
                infoGrid

                // Favorite button
                favoriteButton
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .onAppear { withAnimation(.easeOut(duration: 0.4)) { animateIn = true } }
    }

    // MARK: - Header Card

    private var headerCard: some View {
        VStack(spacing: 16) {
            // Status circle
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 80, height: 80)

                Circle()
                    .fill(statusColor.gradient)
                    .frame(width: 56, height: 56)
                    .shadow(color: statusColor.opacity(0.4), radius: 12, y: 4)

                Image(systemName: spot.isAvailable ? "checkmark" : "xmark")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
            }
            .scaleEffect(animateIn ? 1 : 0.5)
            .opacity(animateIn ? 1 : 0)

            // Spot number + section
            VStack(spacing: 4) {
                Text("Spot \(spotNumber)")
                    .font(.title.weight(.bold))

                HStack(spacing: 6) {
                    Text("Section \(section)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    if spot.isHandicap {
                        Text("\u{2022}")
                            .foregroundColor(.secondary)
                        Label("Handicap", systemImage: "figure.roll")
                            .font(.caption.weight(.medium))
                            .foregroundColor(.blue)
                    }
                }
            }

            // Status pill
            Text(spot.isAvailable ? "Available" : "Occupied")
                .font(.subheadline.weight(.semibold))
                .foregroundColor(statusColor)
                .padding(.horizontal, 20)
                .padding(.vertical, 8)
                .background(statusColor.opacity(0.12))
                .clipShape(Capsule())
        }
    }

    // MARK: - Info Grid

    private var infoGrid: some View {
        let sinceText: String = {
            if let sensor = spot.sensorData {
                return formatSinceTime(sensor.lastUpdated)
            }
            return "just now"
        }()

        return HStack(spacing: 12) {
            // Status duration
            InfoTile(
                icon: spot.isAvailable ? "clock.badge.checkmark" : "clock.badge.xmark",
                iconColor: statusColor,
                label: spot.isAvailable ? "Available" : "Occupied",
                value: sinceText
            )

            // Section info
            InfoTile(
                icon: "map.fill",
                iconColor: .blue,
                label: "Section",
                value: section
            )
        }
    }

    // MARK: - Favorite Button

    private var favoriteButton: some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                favoritesManager.toggle(spotNumber)
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: isFavorite ? "heart.fill" : "heart")
                    .font(.body.weight(.semibold))
                    .foregroundColor(isFavorite ? .pink : .primary)
                    .symbolEffect(.bounce, value: isFavorite)

                Text(isFavorite ? "Remove from Favorites" : "Add to Favorites")
                    .font(.body.weight(.medium))
                    .foregroundColor(isFavorite ? .pink : .primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(isFavorite ? Color.pink.opacity(0.1) : Color(.secondarySystemFill))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isFavorite ? Color.pink.opacity(0.3) : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private func formatSinceTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let date = formatter.date(from: isoString) else {
            let fallback = ISO8601DateFormatter()
            fallback.formatOptions = [.withInternetDateTime]
            guard let date = fallback.date(from: isoString) else {
                return isoString
            }
            return relativeTime(from: date)
        }
        return relativeTime(from: date)
    }

    private func relativeTime(from date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Info Tile

struct InfoTile: View {
    let icon: String
    let iconColor: Color
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(iconColor)

            VStack(spacing: 2) {
                Text(label)
                    .font(.caption2.weight(.medium))
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)

                Text(value)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .padding(.horizontal, 8)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

#Preview {
    SpotDetailSheet(
        spotNumber: 245,
        spot: ParkingSpot(status: .occupied, isHandicap: false)
    )
    .environmentObject(FavoritesManager())
}
