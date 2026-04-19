//
//  SettingsView.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  "Settings" tab. Five sections, top-down:
//
//   • Appearance     — light/dark theme + curated color theme picker.
//   • Notifications  — favorite-spot, lot-full, threshold, test button.
//   • Map            — map style, handicap toggle, spot numbers, refresh.
//   • Dashboard      — show/hide cards on the dashboard tab.
//   • About          — version + privacy policy sheet.
//
//  All persistence flows through `AppSettings` and `NotificationManager`,
//  which back themselves with `UserDefaults`.
//

import SwiftUI

/// Root view for the "Settings" tab.
struct SettingsView: View {
    @State private var showPrivacyPolicy = false
    @EnvironmentObject var appSettings: AppSettings
    @EnvironmentObject var notificationManager: NotificationManager
    @EnvironmentObject var parkingLot: ParkingLotViewModel

    /// Classic is treated as the "original / colorful" theme. Every other
    /// theme ties chrome icons to the accent so the Settings screen reads
    /// as one palette. `chromeIconColor(classic:)` returns the original
    /// per-row color when Classic is selected, or the accent otherwise.
    private func chromeIconColor(classic: Color) -> Color {
        appSettings.colorTheme == .classic ? classic : appSettings.colorTheme.accent
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // App header
                    appHeader

                    // Appearance
                    settingsSection(title: "APPEARANCE") {
                        VStack(spacing: 0) {
                            SettingsRow(icon: "paintbrush.fill", iconColor: chromeIconColor(classic: .purple), title: "Theme") {
                                Picker("", selection: $appSettings.theme) {
                                    ForEach(AppTheme.allCases, id: \.self) { theme in
                                        Text(theme.rawValue).tag(theme)
                                    }
                                }
                                .labelsHidden()
                                .pickerStyle(.menu)
                                .tint(.secondary)
                            }

                            Divider().padding(.leading, 56)

                            // Color theme picker — mini lot previews
                            VStack(alignment: .leading, spacing: 12) {
                                HStack(spacing: 12) {
                                    Image(systemName: "paintpalette.fill")
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(.white)
                                        .frame(width: 28, height: 28)
                                        .background(appSettings.colorTheme.accent.gradient)
                                        .clipShape(RoundedRectangle(cornerRadius: 7))

                                    Text("Color Theme")
                                        .font(.subheadline)

                                    Spacer()

                                    Text(appSettings.colorTheme.displayName)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }

                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 12) {
                                        ForEach(ColorTheme.allCases) { theme in
                                            ColorThemeCard(
                                                theme: theme,
                                                isSelected: appSettings.colorTheme == theme
                                            ) {
                                                withAnimation(.easeInOut(duration: 0.2)) {
                                                    appSettings.colorTheme = theme
                                                }
                                            }
                                        }
                                    }
                                    .padding(.horizontal, 2)
                                    .padding(.vertical, 4)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                    }

                    // Notifications
                    // Icon color story:
                    //   chromeIconColor = follows the accent, except Classic
                    //                     which restores the original color
                    //                     (yellow bell, orange warning).
                    //   pink            = favorites (semantic, stays pink
                    //                     across every theme).
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
                                iconColor: chromeIconColor(classic: .orange),
                                title: "Lot Nearly Full",
                                isOn: $notificationManager.highOccupancyAlerts
                            )

                            if notificationManager.highOccupancyAlerts {
                                Divider().padding(.leading, 56)

                                // Match the parent Lot Nearly Full row's color
                                // (orange on Classic, accent on every other theme).
                                let lotFullColor = chromeIconColor(classic: .orange)
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        Text("Alert Threshold")
                                            .font(.subheadline)
                                        Spacer()
                                        Text("\(notificationManager.highThreshold)%")
                                            .font(.subheadline.weight(.semibold).monospacedDigit())
                                            .foregroundColor(lotFullColor)
                                    }
                                    Slider(
                                        value: Binding(
                                            get: { Double(notificationManager.highThreshold) },
                                            set: { notificationManager.highThreshold = Int($0) }
                                        ),
                                        in: 70...100,
                                        step: 5
                                    )
                                    .tint(lotFullColor)
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                            }

                            Divider().padding(.leading, 56)

                            // Test Notifications — fires one of each alert type, staggered.
                            Button {
                                notificationManager.sendTestNotifications()
                            } label: {
                                SettingsRow(icon: "bell.badge.fill", iconColor: chromeIconColor(classic: .yellow), title: "Test Notifications") {
                                    Image(systemName: "play.fill")
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(Color(.tertiaryLabel))
                                }
                            }
                            .buttonStyle(.plain)

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
                    // Icon color story:
                    //   chromeIconColor = follows the accent, except Classic
                    //                     which restores the original color
                    //                     (teal map, indigo numbers).
                    //   blue            = handicap (semantic — matches the
                    //                     on-map handicap color).
                    //   red             = destructive/sync action (refresh).
                    settingsSection(title: "MAP") {
                        VStack(spacing: 0) {
                            SettingsRow(icon: "map.fill", iconColor: chromeIconColor(classic: .teal), title: "Map Style") {
                                Picker("", selection: $appSettings.mapStyle) {
                                    ForEach(MapStyleChoice.allCases) { style in
                                        Text(style.rawValue).tag(style)
                                    }
                                }
                                .labelsHidden()
                                .pickerStyle(.menu)
                                .tint(.secondary)
                            }

                            Divider().padding(.leading, 56)

                            SettingsToggleRow(
                                icon: "figure.roll",
                                iconColor: .blue,
                                title: "Handicap Availability",
                                isOn: $appSettings.showHandicapIndicator
                            )

                            Divider().padding(.leading, 56)

                            SettingsToggleRow(
                                icon: "number",
                                iconColor: chromeIconColor(classic: .indigo),
                                title: "Spot Numbers",
                                isOn: $appSettings.showSpotNumbers
                            )

                            Divider().padding(.leading, 56)

                            Button {
                                parkingLot.fetchData()
                            } label: {
                                SettingsRow(icon: "arrow.clockwise", iconColor: .red, title: "Refresh Data") {
                                    Image(systemName: "chevron.right")
                                        .font(.caption.weight(.semibold))
                                        .foregroundColor(Color(.tertiaryLabel))
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    // Dashboard
                    // Icon color story:
                    //   pink = favorites (semantic)
                    //   green = "online"/connection (semantic)
                    //   gray = layout/density preference
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
                                iconColor: .gray,
                                title: "Compact Mode",
                                isOn: $appSettings.compactDashboard
                            )
                        }
                    }

                    // About
                    settingsSection(title: "ABOUT") {
                        VStack(spacing: 0) {
                            SettingsRow(icon: "info.circle.fill", iconColor: .gray, title: "Version") {
                                Text("7.67")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }

                            Divider().padding(.leading, 56)

                            Button {
                                showPrivacyPolicy = true
                            } label: {
                                SettingsRow(icon: "lock.shield.fill", iconColor: chromeIconColor(classic: .blue), title: "Privacy Policy") {
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
        // The SpotSense header (car badge + wordmark) now follows the active
        // color theme so picking Blush paints it pink, Forest paints it green,
        // etc. — the branded tile ties together with every other accent-tinted
        // control on the Settings screen.
        HStack(spacing: 14) {
            RoundedRectangle(cornerRadius: 16)
                .fill(appSettings.colorTheme.accent.gradient)
                .frame(width: 60, height: 60)
                .overlay(
                    Image(systemName: "car.fill")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundColor(.white)
                )
                .shadow(color: appSettings.colorTheme.accent.opacity(0.25), radius: 8, y: 4)

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

// MARK: - Color Theme Card
// Mini "parking lot" preview card. Shows three little spots in the theme's
// available + occupied + handicap colors so the user can see the theme applied
// before committing to it.

struct ColorThemeCard: View {
    let theme: ColorTheme
    let isSelected: Bool
    let action: () -> Void

    private var asphalt: Color {
        Color(red: 0.18, green: 0.18, blue: 0.20)
    }

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                // Mini lot preview — 3 spots on asphalt
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(asphalt)
                        .frame(width: 88, height: 56)

                    HStack(spacing: 5) {
                        miniSpot(color: theme.availableColor)
                        miniSpot(color: theme.availableColor)
                        miniSpot(color: theme.occupiedColor)
                        miniSpot(color: Color(red: 0.20, green: 0.40, blue: 0.90)) // handicap stays blue
                    }

                    if isSelected {
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(theme.accent, lineWidth: 2.5)
                            .frame(width: 88, height: 56)
                    }
                }

                // Label
                HStack(spacing: 5) {
                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(theme.accent)
                    }
                    Text(theme.displayName)
                        .font(.caption.weight(isSelected ? .semibold : .regular))
                        .foregroundColor(isSelected ? .primary : .secondary)
                }
            }
            .accessibilityLabel(Text("Color theme: \(theme.displayName)"))
            .accessibilityAddTraits(isSelected ? [.isSelected] : [])
        }
        .buttonStyle(.plain)
    }

    private func miniSpot(color: Color) -> some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(color)
            .frame(width: 9, height: 28)
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
                        text: "SpotSense only records whether each parking spot is occupied or available. No license plates, no vehicle identification numbers, no images of cars or drivers, and no personal information are ever captured or stored."
                    )

                    privacySection(
                        icon: "lock.fill",
                        color: .green,
                        title: "Data Security",
                        text: "All occupancy data is stored securely on our backend. We do not sell, share, or distribute any data to third parties, advertisers, or partners."
                    )

                    privacySection(
                        icon: "person.crop.circle.badge.xmark",
                        color: .indigo,
                        title: "No User Tracking",
                        text: "SpotSense does not require an account, does not track your location, and does not use analytics or third-party trackers. Your favorites, theme, and settings stay on your device."
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
