//
//  SpotDetailSheet.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Bottom sheet presented when a spot is tapped on the Map tab. Shows a
//  big status badge, the spot number and section, any handicap indicator,
//  a time-since-last-update readout, and controls for favoriting and
//  sharing the spot.
//

import SwiftUI

/// Bottom sheet UI for a single tapped spot.
struct SpotDetailSheet: View {

    /// Spot number (1…308) of the tapped cell.
    let spotNumber: Int

    /// Snapshot of the spot at the moment the sheet opened. Status text
    /// stays stable while the sheet is visible even if the underlying poll
    /// updates the live model.
    let spot: ParkingSpot

    @EnvironmentObject var favoritesManager: FavoritesManager

    /// Drives a one-shot scale-in animation for the status badge.
    @State private var animateIn = false

    // MARK: Derived

    private var section: String {
        LotSection.section(forSpotNumber: spotNumber)?.rawValue ?? "?"
    }

    private var isFavorite: Bool {
        favoritesManager.isFavorite(spotNumber)
    }

    /// Green for available spots, red for occupied. Used by the badge,
    /// status pill, and info tiles so the sheet reads at a glance.
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

                // Share button
                shareButton
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .onAppear { withAnimation(.easeOut(duration: 0.4)) { animateIn = true } }
    }

    // MARK: - Share Button

    /// Plain-text payload sent through the iOS share sheet. Includes the
    /// spot number, section, current status, and a handicap qualifier.
    private var shareText: String {
        let statusWord: String
        if spot.isHandicap {
            statusWord = spot.isAvailable ? "is available (handicap)" : "is occupied (handicap)"
        } else {
            statusWord = spot.isAvailable ? "is available" : "is occupied"
        }
        return "Spot \(spotNumber) (Section \(section)) \(statusWord) right now — SpotSense"
    }

    private var shareButton: some View {
        ShareLink(item: shareText) {
            HStack(spacing: 10) {
                Image(systemName: "square.and.arrow.up")
                    .font(.body.weight(.semibold))
                Text("Share Spot")
                    .font(.body.weight(.medium))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color(.secondarySystemFill))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
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

    /// Converts an ISO-8601 timestamp from the API into a human-friendly
    /// relative string ("3 minutes ago"). Tries the fractional-seconds
    /// variant first because the backend currently emits both forms.
    private func formatSinceTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let date = formatter.date(from: isoString) else {
            // Fallback: same string without the fractional-seconds option.
            let fallback = ISO8601DateFormatter()
            fallback.formatOptions = [.withInternetDateTime]
            guard let date = fallback.date(from: isoString) else {
                return isoString
            }
            return relativeTime(from: date)
        }
        return relativeTime(from: date)
    }

    /// Wraps `RelativeDateTimeFormatter` with the "full" units style
    /// (e.g. "5 minutes ago" instead of "5m ago").
    private func relativeTime(from date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Info Tile

/// Reusable card used in the detail sheet's info grid (status duration +
/// section). Square layout with an SF Symbol on top and a title/value below.
struct InfoTile: View {
    let icon:      String
    let iconColor: Color
    let label:     String
    let value:     String

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
