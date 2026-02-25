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

    var body: some View {
        NavigationStack {
            List {
                Section("General") {
                    Label("Notifications", systemImage: "bell")
                    Picker(selection: $appSettings.theme) {
                        ForEach(AppTheme.allCases, id: \.self) { theme in
                            Text(theme.rawValue).tag(theme)
                        }
                    } label: {
                        Label("Appearance", systemImage: "paintbrush")
                    }
                }

                Section("About") {
                    HStack {
                        Label("Version", systemImage: "info.circle")
                        Spacer()
                        Text("1.5.0")
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
            .navigationTitle("Settings")
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
}
