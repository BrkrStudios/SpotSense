//
//  FavoritesManager.swift
//  SpotSense
//
//  Persists favorited spot numbers via UserDefaults.
//

import Foundation
import Combine

class FavoritesManager: ObservableObject {
    private static let key = "favoritedSpots"

    @Published var favorites: Set<Int> {
        didSet { save() }
    }

    init() {
        if let array = UserDefaults.standard.array(forKey: Self.key) as? [Int] {
            self.favorites = Set(array)
        } else {
            self.favorites = []
        }
    }

    func toggle(_ spotNumber: Int) {
        if favorites.contains(spotNumber) {
            favorites.remove(spotNumber)
        } else {
            favorites.insert(spotNumber)
        }
    }

    func isFavorite(_ spotNumber: Int) -> Bool {
        favorites.contains(spotNumber)
    }

    /// Number of favorited spots that are currently available
    func availableFavoritesCount(in map: ParkingLotMap) -> Int {
        var count = 0
        for spotNum in favorites {
            guard let pos = ParkingLotMap.position(forSpotNumber: spotNum) else { continue }
            let spot = map.map[pos.row][pos.col]
            if spot.isAvailable { count += 1 }
        }
        return count
    }

    private func save() {
        UserDefaults.standard.set(Array(favorites), forKey: Self.key)
    }
}
