//
//  MainTabView.swift
//  SpotSense
//
//  Created by Xander Angulo on 2/4/26.
//

import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Dashboard", systemImage: "chart.bar.fill")
                }

            ParkingLotSelectionView()
                .tabItem {
                    Label("Map", systemImage: "map.fill")
                }

            FavoritesView()
                .tabItem {
                    Label("Favorites", systemImage: "heart.fill")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AppSettings())
        .environmentObject(ParkingLotViewModel())
        .environmentObject(FavoritesManager())
        .environmentObject(NotificationManager())
}
