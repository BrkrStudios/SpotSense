//
//  FavoritesManager.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Holds the set of favorited spot numbers and persists them in
//  `UserDefaults`. Favorites are simple integers (the spot number) so the
//  storage format is just an `[Int]`.
//
//  No personal data is involved — favorites stay on the device and are
//  never sent to the backend.
//

import Foundation
import Combine

/// Tracks which parking spot numbers the user has marked as favorites.
/// Observers (UI views) re-render automatically whenever `favorites` changes.
final class FavoritesManager: ObservableObject {

    /// Key used for `UserDefaults` storage.
    private static let storageKey = "favoritedSpots"

    /// All favorited spot numbers. Re-saving happens automatically on change.
    @Published var favorites: Set<Int> {
        didSet { save() }
    }

    // MARK: - Init

    init() {
        // Restore previously saved favorites; default to an empty set.
        if let array = UserDefaults.standard.array(forKey: Self.storageKey) as? [Int] {
            self.favorites = Set(array)
        } else {
            self.favorites = []
        }
    }

    // MARK: - Mutations

    /// Adds the spot if it is not already a favorite, otherwise removes it.
    func toggle(_ spotNumber: Int) {
        if favorites.contains(spotNumber) {
            favorites.remove(spotNumber)
        } else {
            favorites.insert(spotNumber)
        }
    }

    /// Convenience predicate used by detail views and renderers.
    func isFavorite(_ spotNumber: Int) -> Bool {
        favorites.contains(spotNumber)
    }

    // MARK: - Aggregates

    /// Counts how many favorited spots are currently marked as available in
    /// the supplied parking map snapshot. Used by the dashboard summary card.
    func availableFavoritesCount(in map: ParkingLotMap) -> Int {
        var count = 0
        for spotNum in favorites {
            guard let pos = ParkingLotMap.position(forSpotNumber: spotNum) else { continue }
            let spot = map.map[pos.row][pos.col]
            if spot.isAvailable { count += 1 }
        }
        return count
    }

    // MARK: - Persistence

    /// Writes the favorites set to `UserDefaults` as a plain `[Int]`.
    private func save() {
        UserDefaults.standard.set(Array(favorites), forKey: Self.storageKey)
    }
}
