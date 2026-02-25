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
            VStack(spacing: 20) {
                Text("Select a Parking Lot")
                    .font(.title2)
                    .fontWeight(.bold)
                    .padding(.top)

                // Parking Lot 3 - Active
                NavigationLink(destination: ParkingLotDetailView()) {
                    ParkingLotCard(
                        name: "Parking Lot 3",
                        isComingSoon: false
                    )
                }
                .buttonStyle(.plain)

                // Parking Lot 5 - Coming Soon
                ParkingLotCard(
                    name: "Parking Lot 5",
                    isComingSoon: true
                )

                Spacer()
            }
            .padding(.horizontal)
            .navigationTitle("SpotSense")
            .background((appSettings.theme.backgroundColor ?? Color.clear).ignoresSafeArea())
        }
    }
}

// MARK: - Parking Lot Card

struct ParkingLotCard: View {
    let name: String
    let isComingSoon: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(.systemGray6))
                .frame(height: 120)

            VStack(spacing: 8) {
                Image(systemName: "car.fill")
                    .font(.title)
                    .foregroundColor(isComingSoon ? .gray : .blue)
                Text(name)
                    .font(.headline)
                    .foregroundColor(isComingSoon ? .gray : .primary)
            }

            if isComingSoon {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.black.opacity(0.4))
                    .frame(height: 120)
                Text("Coming Soon")
                    .font(.headline)
                    .foregroundColor(.white)
            }
        }
    }
}

#Preview {
    ParkingLotSelectionView()
        .environmentObject(AppSettings())
}
