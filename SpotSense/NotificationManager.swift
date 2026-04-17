//
//  NotificationManager.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Owns the local-notification system used throughout the app:
//   - Tracks user preferences (which alerts are enabled, occupancy threshold).
//   - Compares each new poll's parking map against the previous one and fires
//     the appropriate alert when a watched event happens.
//   - Provides a "Test Notifications" entry point used by Settings so the
//     alert flow can be demoed without waiting for real spot changes.
//
//  No personal data, no analytics, no third-party services are involved.
//  Everything runs locally through Apple's UserNotifications framework.
//

import Foundation
import Combine
import UserNotifications

/// Central coordinator for all local notifications shown by SpotSense.
///
/// Conforms to `UNUserNotificationCenterDelegate` so banners are allowed to
/// appear while the app is in the foreground (otherwise iOS silently drops
/// them, which made the in-app "Test Notifications" button look broken).
final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate {

    // MARK: - User Preferences (persisted in UserDefaults)

    /// Fire a banner whenever a favorited spot transitions to available.
    @Published var favoriteSpotAlerts: Bool {
        didSet { UserDefaults.standard.set(favoriteSpotAlerts, forKey: "notif_favoriteSpot") }
    }

    /// Fire a banner when a non-favorite spot in the same section as a
    /// favorite becomes available (a "near a favorite" hint).
    @Published var nearbySpotAlerts: Bool {
        didSet { UserDefaults.standard.set(nearbySpotAlerts, forKey: "notif_nearbySpot") }
    }

    /// Fire a banner when overall lot occupancy crosses the configured threshold.
    @Published var highOccupancyAlerts: Bool {
        didSet { UserDefaults.standard.set(highOccupancyAlerts, forKey: "notif_highOccupancy") }
    }

    /// Threshold (percent occupied) at which the "lot nearly full" alert fires.
    @Published var highThreshold: Int {
        didSet { UserDefaults.standard.set(highThreshold, forKey: "notif_highThreshold") }
    }

    /// Mirrors the system-level notification authorization status. Updated by
    /// `requestPermission()` and `checkAuthorizationStatus()`.
    @Published var isAuthorized: Bool = false

    // MARK: - Debounce State (per-app-launch, not persisted)

    /// Spot numbers already alerted on for the "favorite opened" event.
    /// Cleared per spot when that spot becomes occupied again.
    private var notifiedFavoriteSpots: Set<Int> = []

    /// Spot numbers already alerted on for the "nearby a favorite opened"
    /// event. Cleared per spot when that spot becomes occupied again.
    private var notifiedNearbySpots: Set<Int> = []

    /// Tracks whether the high-occupancy alert has fired so it does not
    /// re-fire on every poll above the threshold. Resets with hysteresis
    /// (5% drop below the threshold).
    private var highOccupancyFired: Bool = false

    // MARK: - Init

    override init() {
        // Restore persisted preferences (or fall back to sensible defaults).
        self.favoriteSpotAlerts  = UserDefaults.standard.object(forKey: "notif_favoriteSpot")  as? Bool ?? true
        self.nearbySpotAlerts    = UserDefaults.standard.object(forKey: "notif_nearbySpot")    as? Bool ?? false
        self.highOccupancyAlerts = UserDefaults.standard.object(forKey: "notif_highOccupancy") as? Bool ?? true
        self.highThreshold       = UserDefaults.standard.object(forKey: "notif_highThreshold") as? Int  ?? 90
        super.init()

        // Become the system delegate so foreground notifications can display.
        UNUserNotificationCenter.current().delegate = self
    }

    // MARK: - Permission

    /// Asks the user (via the system prompt) to allow local notifications.
    /// Safe to call repeatedly; iOS only prompts once per install.
    func requestPermission() {
        UNUserNotificationCenter.current()
            .requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, _ in
                DispatchQueue.main.async {
                    self?.isAuthorized = granted
                }
            }
    }

    /// Refreshes `isAuthorized` from the system. Called on launch and after
    /// returning from System Settings so the in-app banner reflects reality.
    func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                self?.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }

    // MARK: - Per-Poll Evaluation

    /// Inspects the difference between the previous and current parking maps
    /// and fires whichever notifications the user has enabled.
    ///
    /// Called by the view model after each successful API poll.
    /// - Parameters:
    ///   - previousMap: Snapshot from the prior poll (`nil` on the very first
    ///     poll; nothing fires in that case).
    ///   - currentMap:  Latest snapshot from the API.
    ///   - favorites:   Spot numbers the user has favorited.
    ///   - occupancyPercent: Whole-lot occupancy as a percent (0–100).
    func evaluateChanges(
        previousMap: ParkingLotMap?,
        currentMap: ParkingLotMap,
        favorites: Set<Int>,
        occupancyPercent: Int
    ) {
        // No-op if the user disabled notifications at the system level.
        guard isAuthorized else { return }
        // First poll has no previous snapshot to diff against.
        guard let prev = previousMap else { return }

        let parkingRows = ParkingLotMap.parkingRowOrder
        let spotsPerRow = ParkingLotMap.spotsPerRow

        // Collect spot numbers that flipped from occupied → available this poll.
        var newlyAvailable: Set<Int> = []

        for row in parkingRows {
            for col in 0..<spotsPerRow {
                let oldSpot = prev.map[row][col]
                let newSpot = currentMap.map[row][col]

                // Skip non-spots (light poles, hatched cells, etc).
                guard newSpot.status != .notASpot else { continue }
                guard let spotNum = ParkingLotMap.spotNumber(forRow: row, col: col) else { continue }

                // Open transition: candidate for an alert.
                if oldSpot.status == .occupied && newSpot.isAvailable {
                    newlyAvailable.insert(spotNum)
                }

                // Re-occupied: clear debounce so a future re-open will alert again.
                if newSpot.status == .occupied {
                    notifiedFavoriteSpots.remove(spotNum)
                    notifiedNearbySpots.remove(spotNum)
                }
            }
        }

        // 1. Favorite-spot opens.
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

        // 2. Nearby-to-favorite opens (same section, not the favorite itself).
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

        // 3. High-occupancy crossing.
        if highOccupancyAlerts {
            if occupancyPercent >= highThreshold && !highOccupancyFired {
                highOccupancyFired = true
                sendNotification(
                    title: "Lot Nearly Full",
                    body: "The lot is at \(occupancyPercent)% capacity.",
                    identifier: "high-occ-\(Date().timeIntervalSince1970)"
                )
            } else if occupancyPercent < highThreshold - 5 {
                // 5% hysteresis prevents ping-pong if occupancy hovers at threshold.
                highOccupancyFired = false
            }
        }
    }

    // MARK: - Test Notifications (used by Settings during demos)

    /// Fires one of each notification type, staggered ~1.5 s apart.
    ///
    /// If permission was never requested, this triggers the system prompt and
    /// returns; tapping the button again after granting permission will then
    /// produce the actual banners.
    func sendTestNotifications() {
        // Re-check live status because the cached `isAuthorized` may be stale.
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            guard let self = self else { return }

            DispatchQueue.main.async {
                let granted = settings.authorizationStatus == .authorized
                    || settings.authorizationStatus == .provisional
                self.isAuthorized = granted

                // No permission yet: kick off the prompt and bail. Caller will
                // see the system dialog; another tap fires the test banners.
                guard granted else {
                    self.requestPermission()
                    return
                }

                // Stagger the three sample alerts so each appears separately.
                self.sendNotification(
                    title: "Favorite Spot Available!",
                    body: "Spot 142 in Section C just opened up.",
                    identifier: "test-fav-\(Date().timeIntervalSince1970)",
                    delay: 1.0
                )
                self.sendNotification(
                    title: "Spot Near Your Favorite Opened",
                    body: "Spot 145 in Section C is now available.",
                    identifier: "test-nearby-\(Date().timeIntervalSince1970)",
                    delay: 2.5
                )
                self.sendNotification(
                    title: "Lot Nearly Full",
                    body: "The lot is at 92% capacity.",
                    identifier: "test-high-\(Date().timeIntervalSince1970)",
                    delay: 4.0
                )
            }
        }
    }

    // MARK: - Internal Send

    /// Schedules a single local notification.
    /// - Parameters:
    ///   - title: Bold text shown in the banner.
    ///   - body:  Secondary text shown below the title.
    ///   - identifier: Unique identifier used to coalesce/replace pending
    ///     notifications. Each call uses a timestamp suffix.
    ///   - delay: Seconds to wait before delivery (`>= 1` is required by iOS
    ///     when using a time-interval trigger; `0` fires immediately).
    private func sendNotification(title: String, body: String, identifier: String, delay: TimeInterval = 0) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body  = body
        content.sound = .default

        // Time-interval triggers must be > 0; immediate notifications use nil.
        let trigger: UNNotificationTrigger? = delay > 0
            ? UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
            : nil

        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                #if DEBUG
                print("[NotificationManager] Failed to schedule: \(error.localizedDescription)")
                #endif
            }
        }
    }

    // MARK: - UNUserNotificationCenterDelegate

    /// Called by iOS just before a notification is presented while the app is
    /// in the foreground. Returning `[.banner, .sound]` keeps the banner
    /// visible (default behavior would hide it during foreground).
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .list])
    }

    /// Tapping a notification just brings the app to the foreground; no extra
    /// routing is needed for SpotSense's flow.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        completionHandler()
    }
}
