//
//  NotificationManager.swift
//  SpotSense
//
//  Local notification system for spot availability, occupancy thresholds, and nearby spots.
//

import Foundation
import Combine
import UserNotifications

class NotificationManager: ObservableObject {
    // MARK: - Preferences (UserDefaults-backed)

    @Published var favoriteSpotAlerts: Bool {
        didSet { UserDefaults.standard.set(favoriteSpotAlerts, forKey: "notif_favoriteSpot") }
    }
    @Published var nearbySpotAlerts: Bool {
        didSet { UserDefaults.standard.set(nearbySpotAlerts, forKey: "notif_nearbySpot") }
    }
    @Published var highOccupancyAlerts: Bool {
        didSet { UserDefaults.standard.set(highOccupancyAlerts, forKey: "notif_highOccupancy") }
    }
    @Published var highThreshold: Int {
        didSet { UserDefaults.standard.set(highThreshold, forKey: "notif_highThreshold") }
    }
    @Published var isAuthorized: Bool = false

    // MARK: - Debounce State

    /// Tracks spots we've already notified about to prevent repeat notifications
    private var notifiedFavoriteSpots: Set<Int> = []
    /// Tracks nearby spots we've already notified about
    private var notifiedNearbySpots: Set<Int> = []
    /// Whether we've already fired the high occupancy alert
    private var highOccupancyFired: Bool = false

    init() {
        self.favoriteSpotAlerts = UserDefaults.standard.object(forKey: "notif_favoriteSpot") as? Bool ?? true
        self.nearbySpotAlerts = UserDefaults.standard.object(forKey: "notif_nearbySpot") as? Bool ?? false
        self.highOccupancyAlerts = UserDefaults.standard.object(forKey: "notif_highOccupancy") as? Bool ?? true
        self.highThreshold = UserDefaults.standard.object(forKey: "notif_highThreshold") as? Int ?? 90
    }

    // MARK: - Permission

    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, _ in
            DispatchQueue.main.async {
                self?.isAuthorized = granted
            }
        }
    }

    func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                self?.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }

    // MARK: - Evaluate Changes (called after each API poll)

    func evaluateChanges(
        previousMap: ParkingLotMap?,
        currentMap: ParkingLotMap,
        favorites: Set<Int>,
        occupancyPercent: Int
    ) {
        guard isAuthorized else { return }
        guard let prev = previousMap else { return }

        // Find spots that changed from occupied → available
        let parkingRows = ParkingLotMap.parkingRowOrder
        let spotsPerRow = ParkingLotMap.spotsPerRow

        var newlyAvailable: Set<Int> = []

        for row in parkingRows {
            for col in 0..<spotsPerRow {
                let oldSpot = prev.map[row][col]
                let newSpot = currentMap.map[row][col]

                guard newSpot.status != .notASpot else { continue }
                guard let spotNum = ParkingLotMap.spotNumber(forRow: row, col: col) else { continue }

                // Spot transitioned from occupied to available
                if oldSpot.status == .occupied && newSpot.isAvailable {
                    newlyAvailable.insert(spotNum)
                }

                // Spot became occupied again — reset debounce
                if newSpot.status == .occupied {
                    notifiedFavoriteSpots.remove(spotNum)
                    notifiedNearbySpots.remove(spotNum)
                }
            }
        }

        // 1. Favorite spot alerts
        if favoriteSpotAlerts {
            for spotNum in newlyAvailable where favorites.contains(spotNum) {
                guard !notifiedFavoriteSpots.contains(spotNum) else { continue }
                notifiedFavoriteSpots.insert(spotNum)
                let section = LotSection.section(forSpotNumber: spotNum)?.rawValue ?? ""
                sendNotification(
                    title: "Favorite Spot Available!",
                    body: "Spot \(spotNum) in Section \(section) just opened up.",
                    identifier: "fav-\(spotNum)-\(Date().timeIntervalSince1970)"
                )
            }
        }

        // 2. Nearby spot alerts (same section as any favorite)
        if nearbySpotAlerts {
            let favoriteSections: Set<String> = Set(
                favorites.compactMap { LotSection.section(forSpotNumber: $0)?.rawValue }
            )

            for spotNum in newlyAvailable where !favorites.contains(spotNum) {
                guard !notifiedNearbySpots.contains(spotNum) else { continue }
                guard let section = LotSection.section(forSpotNumber: spotNum) else { continue }
                guard favoriteSections.contains(section.rawValue) else { continue }

                notifiedNearbySpots.insert(spotNum)
                sendNotification(
                    title: "Spot Near Your Favorite Opened",
                    body: "Spot \(spotNum) in Section \(section.rawValue) is now available.",
                    identifier: "nearby-\(spotNum)-\(Date().timeIntervalSince1970)"
                )
            }
        }

        // 3. High occupancy alert (fire when crossing threshold upward)
        if highOccupancyAlerts {
            if occupancyPercent >= highThreshold && !highOccupancyFired {
                highOccupancyFired = true
                sendNotification(
                    title: "Lot Nearly Full",
                    body: "The lot is at \(occupancyPercent)% capacity.",
                    identifier: "high-occ-\(Date().timeIntervalSince1970)"
                )
            } else if occupancyPercent < highThreshold - 5 {
                highOccupancyFired = false // Reset with 5% hysteresis
            }
        }
    }

    // MARK: - Send

    private func sendNotification(title: String, body: String, identifier: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: nil // Fire immediately
        )

        UNUserNotificationCenter.current().add(request)
    }
}
