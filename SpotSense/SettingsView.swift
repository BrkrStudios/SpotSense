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
            ScrollView {
                VStack(spacing: 24) {
                    // App header
                    appHeader

                    // Appearance
                    settingsSection(title: "APPEARANCE") {
                        SettingsRow(icon: "paintbrush.fill", iconColor: .purple, title: "Theme") {
                            Picker("", selection: $appSettings.theme) {
                                ForEach(AppTheme.allCases, id: \.self) { theme in
                                    Text(theme.rawValue).tag(theme)
                                }
                            }
                            .labelsHidden()
                            .pickerStyle(.menu)
                            .tint(.secondary)
                        }
                    }

                    // Notifications
                    settingsSection(title: "NOTIFICATIONS") {
                        VStack(spacing: 0) {
                            SettingsToggleRow(
                                icon: "heart.fill",
                                iconColor: .pink,
                                title: "Favorite Spot Opens",
                                isOn: $notificationManager.favoriteSpotAlerts
                            )

                            Divider().padding(.leading, 56)

                            SettingsToggleRow(
                                icon: "exclamationmark.triangle.fill",
                                iconColor: .orange,
                                title: "Lot Nearly Full",
                                isOn: $notificationManager.highOccupancyAlerts
                            )

                            if notificationManager.highOccupancyAlerts {
                                Divider().padding(.leading, 56)

                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text("Alert Threshold")
                                            .font(.subheadline)
                                        Spacer()
                                        Text("\(notificationManager.highThreshold)%")
                                            .font(.subheadline.weight(.semibold).monospacedDigit())
                                            .foregroundColor(.orange)
                                    }
                                    Slider(
                                        value: Binding(
                                            get: { Double(notificationManager.highThreshold) },
                                            set: { notificationManager.highThreshold = Int($0) }
                                        ),
                                        in: 70...100,
                                        step: 5
                                    )
                                    .tint(.orange)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                            }

                            if !notificationManager.isAuthorized {
                                Divider().padding(.leading, 56)

                                HStack(spacing: 10) {
                                    Image(systemName: "bell.slash.fill")
                                        .font(.caption)
                                        .foregroundColor(.orange)
                                    Text("Enable notifications in System Settings to receive alerts.")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                            }
                        }
                    }

                    // Map
                    settingsSection(title: "MAP") {
                        VStack(spacing: 0) {
                            SettingsToggleRow(
                                icon: "figure.roll",
                                iconColor: .blue,
                                title: "Handicap Availability",
                                isOn: $appSettings.showHandicapIndicator
                            )

                            Divider().padding(.leading, 56)

                            SettingsToggleRow(
                                icon: "number",
                                iconColor: .indigo,
                                title: "Spot Numbers",
                                isOn: $appSettings.showSpotNumbers
                            )

                            Divider().padding(.leading, 56)

                            Button {
                                parkingLot.fetchData()
                            } label: {
                                SettingsRow(icon: "arrow.clockwise", iconColor: .green, title: "Refresh Data") {
                                    Image(systemName: "chevron.right")
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(Color(.tertiaryLabel))
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Dashboard
                    settingsSection(title: "DASHBOARD") {
                        VStack(spacing: 0) {
                            SettingsToggleRow(
                                icon: "heart.fill",
                                iconColor: .pink,
                                title: "Favorites Summary",
                                isOn: $appSettings.showFavoritesOnDashboard
                            )

                            Divider().padding(.leading, 56)

                            SettingsToggleRow(
                                icon: "antenna.radiowaves.left.and.right",
                                iconColor: .green,
                                title: "Connection Status",
                                isOn: $appSettings.showLastSync
                            )

                            Divider().padding(.leading, 56)

                            SettingsToggleRow(
                                icon: "rectangle.compress.vertical",
                                iconColor: .teal,
                                title: "Compact Mode",
                                isOn: $appSettings.compactDashboard
                            )
                        }
                    }

                    // About
                    settingsSection(title: "ABOUT") {
                        VStack(spacing: 0) {
                            SettingsRow(icon: "info.circle.fill", iconColor: .gray, title: "Version") {
                                Text("2.0.0")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }

                            Divider().padding(.leading, 56)

                            Button {
                                showPrivacyPolicy = true
                            } label: {
                                SettingsRow(icon: "lock.shield.fill", iconColor: .blue, title: "Privacy Policy") {
                                    Image(systemName: "chevron.right")
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(Color(.tertiaryLabel))
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Footer
                    VStack(spacing: 4) {
                        Text("SpotSense")
                            .font(.caption.weight(.medium))
                            .foregroundColor(Color(.tertiaryLabel))
                        Text("Built as a school project")
                            .font(.caption2)
                            .foregroundColor(Color(.quaternaryLabel))
                    }
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
            }
            .navigationBarHidden(true)
            .background(appSettings.theme.backgroundColor ?? Color(.systemGroupedBackground))
            .sheet(isPresented: $showPrivacyPolicy) {
                PrivacyPolicyView()
            }
        }
    }

    // MARK: - App Header

    private var appHeader: some View {
        HStack(spacing: 14) {
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [Color.blue, Color.cyan],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 60, height: 60)
                .overlay(
                    Image(systemName: "car.fill")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundColor(.white)
                )
                .shadow(color: .blue.opacity(0.25), radius: 8, y: 4)

            VStack(alignment: .leading, spacing: 3) {
                Text("SpotSense")
                    .font(.title2.weight(.bold))
                Text("Smart Parking")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding(.vertical, 8)
    }

    // MARK: - Section Builder

    private func settingsSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundColor(.secondary)
                .padding(.leading, 16)

            content()
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }
}

// MARK: - Settings Row

struct SettingsRow<Trailing: View>: View {
    let icon: String
    let iconColor: Color
    let title: String
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(iconColor.gradient)
                .frame(width: 30, height: 30)
                .overlay(
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                )

            Text(title)
                .font(.body)

            Spacer()

            trailing()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }
}

// MARK: - Settings Toggle Row

struct SettingsToggleRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(iconColor.gradient)
                .frame(width: 30, height: 30)
                .overlay(
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                )

            Text(title)
                .font(.body)

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

// MARK: - Privacy Policy

struct PrivacyPolicyView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("SpotSense is a school project designed to help visualize parking lot availability.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.bottom, 4)

                    privacySection(
                        icon: "eye.slash.fill",
                        color: .blue,
                        title: "Data Collection",
                        text: "We collect general vehicle presence data to determine parking spot availability. No license plate numbers, vehicle identification numbers, or exact vehicle details are ever captured or stored."
                    )

                    privacySection(
                        icon: "cpu.fill",
                        color: .purple,
                        title: "AI Training",
                        text: "Vehicle imagery may be used to improve our AI's ability to detect and classify different types of cars. This data is stored securely and used solely for model training purposes."
                    )

                    privacySection(
                        icon: "lock.fill",
                        color: .green,
                        title: "Data Security",
                        text: "All collected data is stored securely. We do not sell, share, or distribute any data to third parties."
                    )

                    privacySection(
                        icon: "graduationcap.fill",
                        color: .orange,
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
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func privacySection(icon: String, color: Color, title: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            RoundedRectangle(cornerRadius: 8)
                .fill(color.gradient)
                .frame(width: 30, height: 30)
                .overlay(
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text(text)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppSettings())
        .environmentObject(NotificationManager())
        .environmentObject(ParkingLotViewModel())
}
