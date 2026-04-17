//
//  ParkingLotSelectionView.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Thin wrapper that hosts the parking-lot map inside its own
//  `NavigationStack`. Kept separate from `MainTabView` so future versions
//  can show a list of multiple lots here without disturbing the tab bar.
//

import SwiftUI

struct ParkingLotSelectionView: View {

    @EnvironmentObject var appSettings: AppSettings

    var body: some View {
        NavigationStack {
            // Right now the app supports a single lot, so the detail view is
            // pushed directly. Future multi-lot support would replace this
            // with a List of available lots.
            ParkingLotDetailView()
        }
    }
}

// MARK: - Preview

#Preview {
    ParkingLotSelectionView()
        .environmentObject(AppSettings())
        .environmentObject(ParkingLotViewModel())
        .environmentObject(FavoritesManager())
}
