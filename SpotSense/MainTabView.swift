//
//  MainTabView.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Root tab bar shown after launch. Holds four tabs:
//
//   • Dashboard  — occupancy ring, trend, stats, section breakdown.
//   • Map        — Apple Maps with the live parking lot overlay.
//   • Favorites  — list of favorited spots and their statuses.
//   • Settings   — preferences (theme, color, notifications, about).
//
//  The selected tab is bound to `AppSettings.selectedTab` so other parts of
//  the app (e.g. tapping a favorite to jump to the Map tab) can navigate
//  programmatically.
//

import SwiftUI

struct MainTabView: View {

    @EnvironmentObject var appSettings: AppSettings

    var body: some View {
        TabView(selection: $appSettings.selectedTab) {

            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "chart.bar.fill") }
                .tag(0)

            ParkingLotSelectionView()
                .tabItem { Label("Map", systemImage: "map.fill") }
                .tag(1)

            FavoritesView()
                .tabItem { Label("Favorites", systemImage: "heart.fill") }
                .tag(2)

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
                .tag(3)
        }
    }
}

// MARK: - Preview

#Preview {
    MainTabView()
        .environmentObject(AppSettings())
        .environmentObject(ParkingLotViewModel())
        .environmentObject(FavoritesManager())
        .environmentObject(NotificationManager())
}
