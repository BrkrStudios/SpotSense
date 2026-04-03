//
//  SettingsView.swift
//  SpotSense
//
//  Created by Xander Angulo on 2/4/26.
//

import SwiftUI

struct SettingsView: View {
    @State private var showPrivacyPolicy = false
    @EnvironmentObject var appSettings: AppSettings
    @EnvironmentObject var notificationManager: NotificationManager
    @EnvironmentObject var parkingLot: ParkingLotViewModel

    var body: some View {
        NavigationStack {
            List {
                Section("General") {
                    Picker(selection: $appSettings.theme) {
                        ForEach(AppTheme.allCases, id: \.self) { theme in
                            Text(theme.rawValue).tag(theme)
                        }
                    } label: {
                        Label("Appearance", systemImage: "paintbrush")
                    }
                }

                // MARK: - Notifications
                Section {
                    Toggle(isOn: $notificationManager.favoriteSpotAlerts) {
                        Label("Favorite Spot Opens", systemImage: "heart.fill")
                    }

                    Toggle(isOn: $notificationManager.highOccupancyAlerts) {
                        Label("Lot Nearly Full", systemImage: "exclamationmark.triangle.fill")
                    }

                    if notificationManager.highOccupancyAlerts {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Threshold: \(notificationManager.highThreshold)%")
                                .font(.subheadline)
                            Slider(
                                value: Binding(
                                    get: { Double(notificationManager.highThreshold) },
                                    set: { notificationManager.highThreshold = Int($0) }
                                ),
                                in: 70...100,
                                step: 5
                            )
                        }
                        .padding(.leading, 28)
                    }

                    Toggle(isOn: $notificationManager.lowOccupancyAlerts) {
                        Label("Lot Has Space", systemImage: "checkmark.circle.fill")
                    }

                    if notificationManager.lowOccupancyAlerts {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Threshold: \(notificationManager.lowThreshold)%")
                                .font(.subheadline)
                            Slider(
                                value: Binding(
                                    get: { Double(notificationManager.lowThreshold) },
                                    set: { notificationManager.lowThreshold = Int($0) }
                                ),
                                in: 10...70,
                                step: 5
                            )
                        }
                        .padding(.leading, 28)
                    }

                    if !notificationManager.isAuthorized {
                        HStack {
                            Image(systemName: "bell.slash")
                                .foregroundColor(.orange)
                            Text("Notifications are disabled in System Settings")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("Notifications")
                } footer: {
                    Text("Notifications are active while SpotSense is running.")
                }

                Section("Parking") {
                    Button {
                        parkingLot.fetchData()
                    } label: {
                        Label("Refresh Data", systemImage: "arrow.clockwise")
                    }
                }

                Section("About") {
                    HStack {
                        Label("Version", systemImage: "info.circle")
                        Spacer()
                        Text("2.0.0")
                            .foregroundColor(.secondary)
                    }
                    Button {
                        showPrivacyPolicy = true
                    } label: {
                        Label("Privacy Policy", systemImage: "lock.shield")
                            .foregroundColor(.primary)
                    }
                }
            }
            .navigationBarHidden(true)
            .scrollContentBackground(appSettings.theme.needsCustomBackground ? .hidden : .visible)
            .background(appSettings.theme.backgroundColor ?? Color.clear)
            .sheet(isPresented: $showPrivacyPolicy) {
                PrivacyPolicyView()
            }
        }
    }
}

struct PrivacyPolicyView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("SpotSense is a school project designed to help visualize parking lot availability.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    privacySection(
                        title: "Data Collection",
                        text: "We collect general vehicle presence data to determine parking spot availability. No license plate numbers, vehicle identification numbers, or exact vehicle details are ever captured or stored."
                    )

                    privacySection(
                        title: "AI Training",
                        text: "Vehicle imagery may be used to improve our AI's ability to detect and classify different types of cars. This data is stored securely and used solely for model training purposes."
                    )

                    privacySection(
                        title: "Data Security",
                        text: "All collected data is stored securely. We do not sell, share, or distribute any data to third parties."
                    )

                    privacySection(
                        title: "School Project Disclaimer",
                        text: "SpotSense is developed as an educational project. It is not a commercial product and is intended for demonstration and learning purposes only."
                    )
                }
                .padding()
            }
            .navigationTitle("Privacy Policy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func privacySection(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.headline)
            Text(text)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppSettings())
        .environmentObject(NotificationManager())
        .environmentObject(ParkingLotViewModel())
}
