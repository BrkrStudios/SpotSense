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
    @Published var shouldResetParkingData: Bool = false
    @Published var selectedTab: Int = 0
    @Published var navigateToSpot: Int? = nil
    @Published var showHandicapIndicator: Bool {
        didSet { UserDefaults.standard.set(showHandicapIndicator, forKey: "showHandicapIndicator") }
    }
    @Published var showSpotNumbers: Bool {
        didSet { UserDefaults.standard.set(showSpotNumbers, forKey: "showSpotNumbers") }
    }
    @Published var showFavoritesOnDashboard: Bool {
        didSet { UserDefaults.standard.set(showFavoritesOnDashboard, forKey: "showFavoritesOnDashboard") }
    }
    @Published var showLastSync: Bool {
        didSet { UserDefaults.standard.set(showLastSync, forKey: "showLastSync") }
    }
    @Published var compactDashboard: Bool {
        didSet { UserDefaults.standard.set(compactDashboard, forKey: "compactDashboard") }
    }

    init() {
        let saved = UserDefaults.standard.string(forKey: "appTheme") ?? AppTheme.system.rawValue
        self.theme = AppTheme(rawValue: saved) ?? .system
        self.showHandicapIndicator = UserDefaults.standard.object(forKey: "showHandicapIndicator") as? Bool ?? true
        self.showSpotNumbers = UserDefaults.standard.object(forKey: "showSpotNumbers") as? Bool ?? true
        self.showFavoritesOnDashboard = UserDefaults.standard.object(forKey: "showFavoritesOnDashboard") as? Bool ?? true
        self.showLastSync = UserDefaults.standard.object(forKey: "showLastSync") as? Bool ?? true
        self.compactDashboard = UserDefaults.standard.object(forKey: "compactDashboard") as? Bool ?? false
    }
}

@main
struct SpotSenseApp: App {
    @StateObject private var appSettings = AppSettings()
    @StateObject private var parkingLot = ParkingLotViewModel()
    @StateObject private var favoritesManager = FavoritesManager()
    @StateObject private var notificationManager = NotificationManager()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environmentObject(appSettings)
                .environmentObject(parkingLot)
                .environmentObject(favoritesManager)
                .environmentObject(notificationManager)
                .preferredColorScheme(appSettings.theme.colorScheme)
                .onAppear {
                    // Wire manager references into the ViewModel
                    parkingLot.notificationManager = notificationManager
                    parkingLot.favoritesManager = favoritesManager

                    // Request notification permission on launch
                    notificationManager.requestPermission()
                    notificationManager.checkAuthorizationStatus()
                }
        }
    }
}
