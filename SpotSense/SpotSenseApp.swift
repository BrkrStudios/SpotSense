//
//  SpotSenseApp.swift
//  SpotSense
//
//  Created by Xander Angulo on 2/4/26.
//

import SwiftUI
import Combine

enum AppTheme: String, CaseIterable, Identifiable {
    case system = "System"
    case light = "Light"
    case dark = "Dark"
    case fullDark = "Full Dark"

    var id: String { rawValue }

    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark, .fullDark: return .dark
        }
    }

    var backgroundColor: Color? {
        switch self {
        case .system, .light: return nil
        case .dark: return Color(red: 0.15, green: 0.15, blue: 0.17)
        case .fullDark: return .black
        }
    }

    var needsCustomBackground: Bool {
        self == .dark || self == .fullDark
    }
}

class AppSettings: ObservableObject {
    @Published var theme: AppTheme {
        didSet {
            UserDefaults.standard.set(theme.rawValue, forKey: "appTheme")
        }
    }

    init() {
        let saved = UserDefaults.standard.string(forKey: "appTheme") ?? AppTheme.system.rawValue
        self.theme = AppTheme(rawValue: saved) ?? .system
    }
}

@main
struct SpotSenseApp: App {
    @StateObject private var appSettings = AppSettings()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environmentObject(appSettings)
                .preferredColorScheme(appSettings.theme.colorScheme)
        }
    }
}
