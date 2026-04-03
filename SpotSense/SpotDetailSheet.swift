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

    private var section: String {
        LotSection.section(forSpotNumber: spotNumber)?.rawValue ?? "?"
    }

    private var isFavorite: Bool {
        favoritesManager.isFavorite(spotNumber)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Handle bar
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.secondary.opacity(0.4))
                .frame(width: 40, height: 5)
                .padding(.top, 10)
                .padding(.bottom, 16)

            ScrollView {
                VStack(spacing: 20) {
                    headerSection
                    statusSection

                    if let sensor = spot.sensorData {
                        statusSinceSection(sensor)
                    }

                    if let url = spot.sensorData?.cameraSnapshotUrl, !url.isEmpty {
                        cameraSection(url)
                    }

                    Spacer(minLength: 20)
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Spot \(spotNumber)")
                    .font(.title.weight(.bold))

                HStack(spacing: 6) {
                    Text("Section \(section)")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    if spot.isHandicap {
                        Label("Handicap", systemImage: "figure.roll")
                            .font(.caption.weight(.medium))
                            .foregroundColor(.blue)
                    }
                }
            }

            Spacer()

            // Favorite toggle
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                    favoritesManager.toggle(spotNumber)
                }
            } label: {
                Image(systemName: isFavorite ? "heart.fill" : "heart")
                    .font(.title2)
                    .foregroundColor(isFavorite ? .pink : .secondary)
                    .symbolEffect(.bounce, value: isFavorite)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Status

    private var statusSection: some View {
        HStack {
            Circle()
                .fill(spot.isAvailable ? Color.green : Color.red)
                .frame(width: 14, height: 14)

            Text(spot.isAvailable ? "Available" : "Occupied")
                .font(.headline)

            Spacer()

            if spot.hasSensor {
                Label("Live Sensor", systemImage: "antenna.radiowaves.left.and.right")
                    .font(.caption.weight(.medium))
                    .foregroundColor(.orange)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.orange.opacity(0.12))
                    .cornerRadius(8)
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(14)
    }

    // MARK: - Status Since

    private func statusSinceSection(_ sensor: ParkingAPISensorData) -> some View {
        let statusLabel = spot.isAvailable ? "Available since" : "Occupied since"
        let statusColor: Color = spot.isAvailable ? .green : .red
        let timeText = formatSinceTime(sensor.lastUpdated)

        return HStack {
            Image(systemName: spot.isAvailable ? "clock.badge.checkmark" : "clock.badge.xmark")
                .font(.title2)
                .foregroundColor(statusColor)

            VStack(alignment: .leading, spacing: 2) {
                Text(statusLabel)
                    .font(.subheadline.weight(.semibold))
                Text(timeText)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(14)
    }

    private func formatSinceTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        guard let date = formatter.date(from: isoString) else {
            // Try without fractional seconds
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

    // MARK: - Camera

    private func cameraSection(_ urlString: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Camera Snapshot", systemImage: "camera.fill")
                .font(.subheadline.weight(.semibold))

            if let url = URL(string: urlString) {
                // Spot 245 = A12 camera is upside down
                let needsFlip = spotNumber == 245
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .rotationEffect(needsFlip ? .degrees(180) : .zero)
                            .cornerRadius(10)
                    case .failure:
                        Label("Failed to load image", systemImage: "exclamationmark.triangle")
                            .foregroundColor(.secondary)
                            .frame(height: 120)
                            .frame(maxWidth: .infinity)
                    case .empty:
                        ProgressView()
                            .frame(height: 120)
                            .frame(maxWidth: .infinity)
                    @unknown default:
                        EmptyView()
                    }
                }
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .cornerRadius(14)
    }
}

#Preview {
    SpotDetailSheet(
        spotNumber: 245,
        spot: ParkingSpot(status: .occupied, isHandicap: false)
    )
    .environmentObject(FavoritesManager())
}
