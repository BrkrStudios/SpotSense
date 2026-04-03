//
//  ParkingLotSelectionView.swift
//  SpotSense
//
//  Created by Xander Angulo on 2/4/26.
//

import SwiftUI

struct ParkingLotSelectionView: View {
    @EnvironmentObject var appSettings: AppSettings

    var body: some View {
        NavigationStack {
            ParkingLotDetailView()
        }
    }
}

#Preview {
    ParkingLotSelectionView()
        .environmentObject(AppSettings())
        .environmentObject(ParkingLotViewModel())
        .environmentObject(FavoritesManager())
}
