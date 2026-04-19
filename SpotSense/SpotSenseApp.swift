//
//  SpotSenseApp.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Application entry point and all of the app-wide settings/preferences
//  models. Three of the most important pieces live here:
//
//   • `MapStyleChoice`  — Standard / Satellite / Hybrid wrapper for MKMapKit.
//   • `ColorTheme`      — curated palettes that drive every spot color, the
//                          counts capsule, the dashboard, and the app accent.
//   • `AppSettings`     — `ObservableObject` that backs every persisted
//                          preference (theme, toggles, accent, map style).
//
//  Persistence is intentionally simple: each `@Published` property writes its
//  value back to `UserDefaults` from a `didSet` block. No external storage,
//  no analytics, no third-party SDKs.
//

import SwiftUI
import Combine
import MapKit

// MARK: - Map Style

/// User-selectable Apple Maps base layer. The raw value is also the label
/// shown in the Settings picker / map dropdown.
enum MapStyleChoice: String, CaseIterable, Identifiable {
    case standard  = "Standard"
    case satellite = "Satellite"
    case hybrid    = "Hybrid"

    var id: String { rawValue }

    /// SF Symbol used to represent the style in UI controls.
    var iconName: String {
        switch self {
        case .standard:  return "map.fill"
        case .satellite: return "globe.americas.fill"
        case .hybrid:    return "square.stack.3d.up.fill"
        }
    }

    /// Concrete `MKMapConfiguration` instance used when applying the style
    /// to the underlying `MKMapView`.
    var configuration: MKMapConfiguration {
        switch self {
        case .standard:  return MKStandardMapConfiguration()
        case .satellite: return MKImageryMapConfiguration()
        case .hybrid:    return MKHybridMapConfiguration()
        }
    }

    /// Convenience used by the cycle button on the map (kept for legacy
    /// callers; the visible UI uses a Menu picker instead).
    var next: MapStyleChoice {
        let all = MapStyleChoice.allCases
        let i   = all.firstIndex(of: self) ?? 0
        return all[(i + 1) % all.count]
    }
}

// MARK: - Color Theme

/// A bundled "look" for the app. Each case defines four coordinated colors:
///
///   • `accent`         — chrome / button tint / selected tab tint.
///   • `availableColor` — fill color for available parking spots.
///   • `occupiedColor`  — fill color for occupied parking spots.
///   • `handicapColor`  — fill color for handicap spots. Classic keeps the
///                        universal accessibility blue; every other theme
///                        pulls from the accent so the handicap tiles blend
///                        with the rest of the lot instead of standing out.
enum ColorTheme: String, CaseIterable, Identifiable {
    case classic
    case blush
    case ocean
    case sunset
    case forest
    case royal
    case mono
    case cyber

    var id: String { rawValue }

    /// Display label shown in Settings (capitalized for the title row).
    var displayName: String {
        switch self {
        case .classic: return "Classic"
        case .blush:   return "Blush"
        case .ocean:   return "Ocean"
        case .sunset:  return "Sunset"
        case .forest:  return "Forest"
        case .royal:   return "Royal"
        case .mono:    return "Mono"
        case .cyber:   return "Cyber"
        }
    }

    // MARK: SwiftUI Colors

    /// App-wide tint color (SwiftUI controls, ShareLink, toggles, etc).
    var accent: Color {
        switch self {
        case .classic: return .blue
        case .blush:   return .pink
        case .ocean:   return Color(red: 0.10, green: 0.65, blue: 0.78)
        case .sunset:  return .orange
        case .forest:  return Color(red: 0.30, green: 0.65, blue: 0.40)
        case .royal:   return .purple
        case .mono:    return Color(white: 0.85)
        case .cyber:   return Color(red: 0.10, green: 0.95, blue: 0.55)
        }
    }

    /// Fill color used for available parking spots in the overlay.
    var availableColor: Color {
        switch self {
        case .classic: return Color(red: 0.20, green: 0.75, blue: 0.30)
        case .blush:   return Color(red: 1.00, green: 0.42, blue: 0.66)
        case .ocean:   return Color(red: 0.18, green: 0.75, blue: 0.78)
        case .sunset:  return Color(red: 1.00, green: 0.55, blue: 0.20)
        case .forest:  return Color(red: 0.45, green: 0.78, blue: 0.50)
        case .royal:   return Color(red: 0.70, green: 0.50, blue: 0.92)
        case .mono:    return Color(white: 0.92)
        case .cyber:   return Color(red: 0.10, green: 0.95, blue: 0.55)
        }
    }

    /// Fill color used for occupied parking spots in the overlay.
    var occupiedColor: Color {
        switch self {
        case .classic: return Color(red: 0.85, green: 0.15, blue: 0.15)
        case .blush:   return Color(red: 0.34, green: 0.22, blue: 0.30)
        case .ocean:   return Color(red: 0.10, green: 0.20, blue: 0.45)
        case .sunset:  return Color(red: 0.50, green: 0.10, blue: 0.25)
        case .forest:  return Color(red: 0.18, green: 0.32, blue: 0.20)
        case .royal:   return Color(red: 0.30, green: 0.15, blue: 0.45)
        case .mono:    return Color(red: 0.30, green: 0.30, blue: 0.32)
        case .cyber:   return Color(red: 1.00, green: 0.15, blue: 0.55)
        }
    }

    /// Fill color used for handicap parking spots in the overlay.
    /// Classic keeps the canonical accessibility blue; every other theme
    /// follows the accent so handicap tiles look intentional in the palette.
    var handicapColor: Color {
        switch self {
        case .classic: return Color(red: 0.20, green: 0.40, blue: 0.90)
        default:       return accent
        }
    }

    // MARK: UIColor variants
    // These are needed because the parking lot is drawn through an
    // `MKOverlayRenderer`, which works in `CGContext` and requires `UIColor`.

    var availableUIColor: UIColor { UIColor(availableColor) }
    var occupiedUIColor:  UIColor { UIColor(occupiedColor)  }
    var handicapUIColor:  UIColor { UIColor(handicapColor)  }
}

// MARK: - App Theme (light / dark / fully black)

/// Controls `colorScheme` and dashboard backgrounds. Distinct from
/// `ColorTheme`, which controls accent/spot colors.
enum AppTheme: String, CaseIterable, Identifiable {
    case system   = "System"
    case light    = "Light"
    case dark     = "Dark"
    case fullDark = "Full Dark"

    var id: String { rawValue }

    /// Resolved `ColorScheme` to apply via `.preferredColorScheme(...)`.
    /// `.system` returns nil so iOS picks based on device settings.
    var colorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light:  return .light
        case .dark, .fullDark: return .dark
        }
    }

    /// Custom background tint used by views that opt in to a uniform
    /// background (the dashboard list, primarily).
    var backgroundColor: Color? {
        switch self {
        case .system, .light: return nil
        case .dark:           return Color(red: 0.15, green: 0.15, blue: 0.17)
        case .fullDark:       return .black
        }
    }

    var needsCustomBackground: Bool {
        self == .dark || self == .fullDark
    }
}

// MARK: - AppSettings

/// Single source of truth for every user preference and a few transient
/// signals (tab selection, "fly to spot" sentinel) shared across views.
///
/// Every persisted property uses the same pattern: `@Published` with a
/// `didSet` that mirrors the value into `UserDefaults`. Defaults are read
/// back in `init()`.
final class AppSettings: ObservableObject {

    // MARK: Persisted Preferences

    @Published var theme: AppTheme {
        didSet { UserDefaults.standard.set(theme.rawValue, forKey: "appTheme") }
    }
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
    @Published var mapStyle: MapStyleChoice {
        didSet { UserDefaults.standard.set(mapStyle.rawValue, forKey: "mapStyle") }
    }
    @Published var colorTheme: ColorTheme {
        didSet { UserDefaults.standard.set(colorTheme.rawValue, forKey: "colorTheme") }
    }

    // MARK: Transient Signals (not persisted)

    /// Bumped to `true` to ask the parking view model to throw away cached
    /// state and reset the camera. Reset to `false` once consumed.
    @Published var shouldResetParkingData: Bool = false

    /// Currently selected tab index (Dashboard / Map / Favorites / Settings).
    @Published var selectedTab: Int = 0

    /// Spot number that another tab (e.g. Favorites) wants the Map tab to
    /// fly to. Cleared after the camera animation kicks off.
    @Published var navigateToSpot: Int? = nil

    // MARK: Helpers

    /// Cycle through the map styles (Standard → Satellite → Hybrid → …).
    func cycleMapStyle() {
        mapStyle = mapStyle.next
    }

    // MARK: Init

    init() {
        // Read every persisted preference, falling back to safe defaults.
        let savedAppTheme = UserDefaults.standard.string(forKey: "appTheme") ?? AppTheme.system.rawValue
        self.theme = AppTheme(rawValue: savedAppTheme) ?? .system

        self.showHandicapIndicator    = UserDefaults.standard.object(forKey: "showHandicapIndicator")    as? Bool ?? true
        self.showSpotNumbers          = UserDefaults.standard.object(forKey: "showSpotNumbers")          as? Bool ?? true
        self.showFavoritesOnDashboard = UserDefaults.standard.object(forKey: "showFavoritesOnDashboard") as? Bool ?? true
        self.showLastSync             = UserDefaults.standard.object(forKey: "showLastSync")             as? Bool ?? true
        self.compactDashboard         = UserDefaults.standard.object(forKey: "compactDashboard")         as? Bool ?? false

        let savedMapStyle = UserDefaults.standard.string(forKey: "mapStyle") ?? MapStyleChoice.standard.rawValue
        self.mapStyle = MapStyleChoice(rawValue: savedMapStyle) ?? .standard

        let savedColorTheme = UserDefaults.standard.string(forKey: "colorTheme") ?? ColorTheme.classic.rawValue
        self.colorTheme = ColorTheme(rawValue: savedColorTheme) ?? .classic
    }
}

// MARK: - Application Entry Point

/// Top-level scene. Builds the four shared `@StateObject` managers and
/// injects them into the view hierarchy via the SwiftUI environment.
@main
struct SpotSenseApp: App {

    @StateObject private var appSettings         = AppSettings()
    @StateObject private var parkingLot          = ParkingLotViewModel()
    @StateObject private var favoritesManager    = FavoritesManager()
    @StateObject private var notificationManager = NotificationManager()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environmentObject(appSettings)
                .environmentObject(parkingLot)
                .environmentObject(favoritesManager)
                .environmentObject(notificationManager)
                // Light/dark mode preference (or follow system).
                .preferredColorScheme(appSettings.theme.colorScheme)
                // App-wide accent pulled from the active color theme.
                .tint(appSettings.colorTheme.accent)
                .onAppear {
                    // Hand the parking view model references to the shared
                    // notification + favorites managers so its polling loop
                    // can fire alerts and read favorites.
                    parkingLot.notificationManager = notificationManager
                    parkingLot.favoritesManager    = favoritesManager

                    // Ask iOS for notification permission and refresh the
                    // current authorization status.
                    notificationManager.requestPermission()
                    notificationManager.checkAuthorizationStatus()
                }
        }
    }
}
