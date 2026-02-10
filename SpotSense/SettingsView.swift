//
//  SettingsView.swift
//  SpotSense
//
//  Created by Xander Angulo on 2/4/26.
//

import SwiftUI

struct SettingsView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("General") {
                    Label("Notifications", systemImage: "bell")
                    Label("Appearance", systemImage: "paintbrush")
                }

                Section("About") {
                    HStack {
                        Label("Version", systemImage: "info.circle")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                    Label("Privacy Policy", systemImage: "lock.shield")
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    SettingsView()
}
