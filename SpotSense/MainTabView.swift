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
            ParkingLotSelectionView()
                .tabItem {
                    Label("Parking", systemImage: "car.fill")
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
}
