//
//  ParkingLotMapView.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Bridges the SwiftUI layer to UIKit's `MKMapView` so the parking grid
//  can be drawn directly on top of real-world Apple Maps tiles. The file
//  owns three things:
//
//   • `ParkingLotOverlay`         — empty `MKOverlay` describing the lot's
//                                    bounding rect (delegated drawing).
//   • `ParkingLotMarker`          — annotation pin shown only when the
//                                    user has zoomed out far enough to
//                                    lose sight of the overlay.
//   • `ParkingLotOverlayRenderer` — Core Graphics renderer that draws
//                                    every spot, its status, the favorite
//                                    outline, and the spot number.
//   • `ParkingLotMapView`         — `UIViewRepresentable` wrapper +
//                                    `MKMapViewDelegate` coordinator.
//
//  The renderer is plain CG drawing inside a rotated CTM; the rotation
//  angle is derived from the four corner coordinates so the overlay always
//  aligns with the real lot regardless of camera heading.
//

import SwiftUI
import MapKit

// MARK: - MKOverlay for the Parking Lot

class ParkingLotOverlay: NSObject, MKOverlay {
    let coordinate: CLLocationCoordinate2D
    let boundingMapRect: MKMapRect

    override init() {
        self.coordinate = ParkingLotGeo.centerCoordinate
        self.boundingMapRect = ParkingLotGeo.expandedOverlayMapRect
        super.init()
    }
}

// MARK: - Far-Zoom Marker
// Shown when the user zooms out so far that the lot overlay shrinks to a few
// pixels. Gives them an obvious "Parking Lot 3" pin to tap/locate.

class ParkingLotMarker: NSObject, MKAnnotation {
    let coordinate: CLLocationCoordinate2D
    let title: String?
    let subtitle: String?

    override init() {
        self.coordinate = ParkingLotGeo.centerCoordinate
        self.title = "Parking Lot 3"
        self.subtitle = "Tap to recenter"
        super.init()
    }
}

// MARK: - Overlay Renderer

class ParkingLotOverlayRenderer: MKOverlayRenderer {
    // Data updated from updateUIView
    var mapData: ParkingLotMap?
    var favorites: Set<Int> = []
    var selectedSpot: Int?
    var showSpotNumbers: Bool = true
    var showHandicapIndicator: Bool = true

    // Theme colors (UIColor for CG drawing). Defaults match the Classic theme
    // so things still render if these are never set. Handicap is now a
    // per-theme color too — swap it in when the ColorTheme changes.
    var availableColor: UIColor = UIColor(red: 0.20, green: 0.75, blue: 0.30, alpha: 1)
    var occupiedColor:  UIColor = UIColor(red: 0.85, green: 0.15, blue: 0.15, alpha: 1)
    var handicapColor:  UIColor = UIColor(red: 0.20, green: 0.40, blue: 0.90, alpha: 1)

    // Pre-rendered SF Symbol images (created on main thread)
    var handicapImage: UIImage?
    var heartImage: UIImage?

    override func draw(_ mapRect: MKMapRect, zoomScale: MKZoomScale, in context: CGContext) {
        guard let mapData = mapData else { return }

        let overlayRect = rect(for: ParkingLotGeo.overlayMapRect)

        // Determine detail level based on zoom
        let effectiveScale = zoomScale * UIScreen.main.scale
        let showNumbers = showSpotNumbers && effectiveScale > 0.4
        let showIcons = effectiveScale > 0.2

        // Scale factors: map grid point dimensions to overlay rect
        let scaleX = overlayRect.width / ParkingLotGeo.gridPointWidth
        let scaleY = overlayRect.height / ParkingLotGeo.gridPointHeight

        context.saveGState()

        // Apply rotation derived from the 4 corner coordinates
        let centerX = overlayRect.midX
        let centerY = overlayRect.midY
        context.translateBy(x: centerX, y: centerY)
        context.rotate(by: CGFloat(ParkingLotGeo.rotationRadians))
        context.translateBy(x: -centerX, y: -centerY)

        // 1. Draw asphalt background
        context.setFillColor(UIColor(red: 0.18, green: 0.18, blue: 0.20, alpha: 1).cgColor)
        context.fill(overlayRect)

        // 2. Draw left road column
        let leftRoad = CGRect(
            x: overlayRect.minX,
            y: overlayRect.minY,
            width: ParkingLotLayout.roadWidth * scaleX,
            height: overlayRect.height
        )
        context.setFillColor(UIColor(red: 0.22, green: 0.22, blue: 0.24, alpha: 1).cgColor)
        context.fill(leftRoad)

        // 3. Draw right road column
        let rightRoad = CGRect(
            x: overlayRect.maxX - ParkingLotLayout.roadWidth * scaleX,
            y: overlayRect.minY,
            width: ParkingLotLayout.roadWidth * scaleX,
            height: overlayRect.height
        )
        context.fill(rightRoad)

        // 4. Draw rows (grass, lanes, parking)
        let parkingX = overlayRect.minX + ParkingLotLayout.roadWidth * scaleX
        let parkingWidth = CGFloat(ParkingLotMap.spotsPerRow) * ParkingLotLayout.spotWidth * scaleX

        drawLanesAndRows(
            context: context,
            mapData: mapData,
            overlayRect: overlayRect,
            parkingX: parkingX,
            parkingWidth: parkingWidth,
            scaleX: scaleX,
            scaleY: scaleY,
            showNumbers: showNumbers,
            showIcons: showIcons
        )

        context.restoreGState()
    }

    // MARK: - Draw Lanes and Rows

    private func drawLanesAndRows(
        context: CGContext,
        mapData: ParkingLotMap,
        overlayRect: CGRect,
        parkingX: CGFloat,
        parkingWidth: CGFloat,
        scaleX: CGFloat,
        scaleY: CGFloat,
        showNumbers: Bool,
        showIcons: Bool
    ) {
        let spotW = ParkingLotLayout.spotWidth * scaleX
        let spotH = ParkingLotLayout.spotHeight * scaleY
        let laneH = ParkingLotLayout.laneHeight * scaleY

        var currentY = overlayRect.minY

        let aisles: [(top: Int, bottom: Int?, lane: Int?)] = [
            (1, nil, 2),
            (3, 4, 5),
            (6, 7, 8),
            (9, 10, 11),
            (12, 13, 14),
            (15, 16, 17),
            (18, 19, 20),
            (21, nil, nil),
        ]

        let laneTypes: [Int: LaneType] = [
            0: .grass, 2: .road, 5: .lane, 8: .lane,
            11: .lane, 14: .lane, 17: .lane, 20: .lane,
        ]

        // Row 0: grass lane
        drawLane(context: context, x: parkingX, y: currentY, width: parkingWidth, height: laneH, type: .grass)
        currentY += laneH

        for aisle in aisles {
            // Top row
            drawParkingRow(
                context: context, mapData: mapData,
                rowIndex: aisle.top, facingUp: true,
                x: parkingX, y: currentY,
                spotW: spotW, spotH: spotH, scaleX: scaleX, scaleY: scaleY,
                showNumbers: showNumbers, showIcons: showIcons
            )
            currentY += spotH

            // Bottom row
            if let bottom = aisle.bottom {
                drawParkingRow(
                    context: context, mapData: mapData,
                    rowIndex: bottom, facingUp: false,
                    x: parkingX, y: currentY,
                    spotW: spotW, spotH: spotH, scaleX: scaleX, scaleY: scaleY,
                    showNumbers: showNumbers, showIcons: showIcons
                )
                currentY += spotH
            }

            // Driving lane
            if let lane = aisle.lane {
                let type = laneTypes[lane] ?? .lane
                drawLane(context: context, x: parkingX, y: currentY, width: parkingWidth, height: laneH, type: type)
                currentY += laneH
            }
        }
    }

    // MARK: - Draw a Lane

    private func drawLane(context: CGContext, x: CGFloat, y: CGFloat, width: CGFloat, height: CGFloat, type: LaneType) {
        let rect = CGRect(x: x, y: y, width: width, height: height)
        let color: UIColor
        switch type {
        case .grass:
            color = UIColor(red: 0.18, green: 0.35, blue: 0.12, alpha: 1)
        case .road:
            color = UIColor(red: 0.22, green: 0.22, blue: 0.24, alpha: 1)
        case .lane:
            color = UIColor(red: 0.22, green: 0.22, blue: 0.24, alpha: 1)
        }
        context.setFillColor(color.cgColor)
        context.fill(rect)

        // Dashed center line for road/lane
        if type != .grass {
            context.saveGState()
            let centerY = y + height / 2
            context.setStrokeColor(UIColor(white: 0.85, alpha: 0.3).cgColor)
            context.setLineWidth(max(1, height * 0.02))
            context.setLineDash(phase: 0, lengths: [height * 0.15, height * 0.15])
            context.move(to: CGPoint(x: x, y: centerY))
            context.addLine(to: CGPoint(x: x + width, y: centerY))
            context.strokePath()
            context.restoreGState()
        }
    }

    // MARK: - Draw a Parking Row

    private func drawParkingRow(
        context: CGContext,
        mapData: ParkingLotMap,
        rowIndex: Int,
        facingUp: Bool,
        x: CGFloat, y: CGFloat,
        spotW: CGFloat, spotH: CGFloat,
        scaleX: CGFloat, scaleY: CGFloat,
        showNumbers: Bool, showIcons: Bool
    ) {
        let grassPositions: Set<String> = [
            "1-0", "1-1", "1-2", "1-19", "1-20", "1-21",
            "3-0", "3-1", "3-2", "3-19", "3-20", "3-21",
        ]

        for col in 0..<ParkingLotMap.spotsPerRow {
            let spotX = x + CGFloat(col) * spotW
            let spotRect = CGRect(x: spotX, y: y, width: spotW, height: spotH)
            let key = "\(rowIndex)-\(col)"
            let spot = mapData.map[rowIndex][col]

            if grassPositions.contains(key) {
                // Grass fill
                context.setFillColor(UIColor(red: 0.18, green: 0.35, blue: 0.12, alpha: 1).cgColor)
                context.fill(spotRect)
                continue
            }

            // Asphalt base
            context.setFillColor(UIColor(red: 0.18, green: 0.18, blue: 0.20, alpha: 1).cgColor)
            context.fill(spotRect)

            // Parking line markings
            drawParkingLines(context: context, rect: spotRect, facingUp: facingUp, isLastCol: col == ParkingLotMap.spotsPerRow - 1, scaleX: scaleX, scaleY: scaleY)

            let spotNum = ParkingLotMap.spotNumber(forRow: rowIndex, col: col) ?? 0
            let isUnusable = spot.status == .notASpot

            if isUnusable {
                // Yellow diagonal hatch
                drawHatchPattern(context: context, rect: spotRect, scaleX: scaleX)
            } else if spot.status != .notASpot {
                // Status indicator (rounded rect)
                let inset = CGRect(
                    x: spotRect.minX + 3 * scaleX,
                    y: spotRect.minY + 4 * scaleY,
                    width: spotRect.width - 6 * scaleX,
                    height: spotRect.height - 8 * scaleY
                )
                let cornerRadius = 4 * min(scaleX, scaleY)
                let indicatorPath = UIBezierPath(roundedRect: inset, cornerRadius: cornerRadius)

                let fillColor: UIColor
                if spot.status == .occupied {
                    fillColor = occupiedColor
                } else if spot.isHandicap {
                    fillColor = handicapColor
                } else {
                    fillColor = availableColor
                }

                context.setFillColor(fillColor.cgColor)
                context.addPath(indicatorPath.cgPath)
                context.fillPath()

                // Favorite outline
                let isFav = favorites.contains(spotNum)
                if isFav {
                    context.setStrokeColor(UIColor.systemPink.cgColor)
                    context.setLineWidth(max(1, 1.5 * min(scaleX, scaleY)))
                    context.addPath(indicatorPath.cgPath)
                    context.strokePath()
                }

                // Selected outline
                if spotNum != 0 && spotNum == selectedSpot {
                    context.setStrokeColor(UIColor.white.cgColor)
                    context.setLineWidth(max(1, 2 * min(scaleX, scaleY)))
                    context.addPath(indicatorPath.cgPath)
                    context.strokePath()
                }

                // Icons (at medium+ zoom)
                if showIcons {
                    // Handicap icon
                    if spot.isHandicap && showHandicapIndicator, let img = handicapImage {
                        let iconSize = min(inset.width, inset.height) * 0.5
                        let iconRect = CGRect(
                            x: inset.midX - iconSize / 2,
                            y: inset.midY - iconSize / 2,
                            width: iconSize,
                            height: iconSize
                        )
                        UIGraphicsPushContext(context)
                        img.draw(in: iconRect)
                        UIGraphicsPopContext()
                    }

                    // Favorite heart
                    if isFav, let img = heartImage {
                        let iconSize = min(inset.width, inset.height) * 0.4
                        let iconRect = CGRect(
                            x: inset.midX - iconSize / 2,
                            y: inset.midY - iconSize / 2 + (spot.isHandicap ? iconSize * 0.6 : 0),
                            width: iconSize,
                            height: iconSize
                        )
                        UIGraphicsPushContext(context)
                        img.draw(in: iconRect)
                        UIGraphicsPopContext()
                    }
                }

                // Spot number — small/subtle, just enough to read at zoom.
                if showNumbers && spotNum > 0 {
                    let digits = max(1, "\(spotNum)".count)
                    let perGlyphWidth: CGFloat = 0.55
                    // Use ~65% of the spot's width budget; cap height to 16%.
                    let maxByWidth  = (spotRect.width * 0.65) / (CGFloat(digits) * perGlyphWidth)
                    let maxByHeight = spotRect.height * 0.16
                    let fontSize = max(3, min(maxByWidth, maxByHeight))

                    let attrs: [NSAttributedString.Key: Any] = [
                        .font: UIFont.systemFont(ofSize: fontSize, weight: .semibold),
                        .foregroundColor: UIColor.white.withAlphaComponent(0.85),
                    ]
                    let text = "\(spotNum)" as NSString
                    let textSize = text.size(withAttributes: attrs)
                    let textX = spotRect.midX - textSize.width / 2
                    let textY: CGFloat
                    if facingUp {
                        textY = spotRect.minY + 2 * scaleY
                    } else {
                        textY = spotRect.maxY - textSize.height - 2 * scaleY
                    }
                    UIGraphicsPushContext(context)
                    text.draw(at: CGPoint(x: textX, y: textY), withAttributes: attrs)
                    UIGraphicsPopContext()
                }
            }
        }
    }

    // MARK: - Parking Line Markings

    private func drawParkingLines(context: CGContext, rect: CGRect, facingUp: Bool, isLastCol: Bool, scaleX: CGFloat, scaleY: CGFloat) {
        let lineWidth = max(0.5, 1.5 * min(scaleX, scaleY))
        context.setStrokeColor(UIColor(red: 0.85, green: 0.85, blue: 0.80, alpha: 1).cgColor)
        context.setLineWidth(lineWidth)

        // Left edge
        context.move(to: CGPoint(x: rect.minX, y: rect.minY))
        context.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        context.strokePath()

        // Right edge (last column only)
        if isLastCol {
            context.move(to: CGPoint(x: rect.maxX, y: rect.minY))
            context.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
            context.strokePath()
        }

        // Back edge
        if facingUp {
            context.move(to: CGPoint(x: rect.minX, y: rect.maxY))
            context.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        } else {
            context.move(to: CGPoint(x: rect.minX, y: rect.minY))
            context.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        }
        context.strokePath()
    }

    // MARK: - Hatch Pattern

    private func drawHatchPattern(context: CGContext, rect: CGRect, scaleX: CGFloat) {
        context.saveGState()
        context.clip(to: rect.insetBy(dx: 3 * scaleX, dy: 4 * scaleX))

        let color = UIColor(red: 0.83, green: 0.63, blue: 0.09, alpha: 1)
        context.setStrokeColor(color.cgColor)
        context.setLineWidth(max(0.5, 1.5 * scaleX))

        let spacing: CGFloat = max(3, 5 * scaleX)
        let count = Int((rect.width + rect.height) / spacing) + 1

        for i in 0..<count {
            let offset = CGFloat(i) * spacing - rect.height
            context.move(to: CGPoint(x: rect.minX + offset, y: rect.maxY))
            context.addLine(to: CGPoint(x: rect.minX + offset + rect.height, y: rect.minY))
        }
        context.strokePath()
        context.restoreGState()
    }
}

// MARK: - UIViewRepresentable

struct ParkingLotMapView: UIViewRepresentable {
    @ObservedObject var parkingLot: ParkingLotViewModel
    @ObservedObject var favoritesManager: FavoritesManager
    @Binding var selectedSpotNumber: Int?
    var showSpotNumbers: Bool
    @Binding var navigateToSpot: Int?
    var showHandicapIndicator: Bool
    var mapStyle: MapStyleChoice = .standard
    var colorTheme: ColorTheme = .classic

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = context.coordinator

        // Map configuration
        mapView.preferredConfiguration = mapStyle.configuration
        mapView.isRotateEnabled = true
        mapView.isScrollEnabled = true
        mapView.isZoomEnabled = true
        mapView.isPitchEnabled = false
        mapView.showsCompass = false
        mapView.showsScale = false
        mapView.pointOfInterestFilter = .excludingAll

        // Set initial camera
        mapView.setCamera(ParkingLotGeo.defaultCamera, animated: false)

        // Add parking lot overlay
        let overlay = ParkingLotOverlay()
        mapView.addOverlay(overlay, level: .aboveRoads)
        context.coordinator.parkingOverlay = overlay

        // Far-zoom marker (added/removed dynamically based on camera altitude)
        let marker = ParkingLotMarker()
        context.coordinator.parkingMarker = marker
        // Sync once at startup
        context.coordinator.updateMarkerVisibility(on: mapView)

        // Tap gesture for spot selection
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        mapView.addGestureRecognizer(tap)

        // Pre-render SF Symbol images on main thread
        let renderer = context.coordinator.overlayRenderer
        renderer?.handicapImage = UIImage(
            systemName: "figure.roll",
            withConfiguration: UIImage.SymbolConfiguration(weight: .bold)
        )?.withTintColor(.white, renderingMode: .alwaysOriginal)

        renderer?.heartImage = UIImage(
            systemName: "heart.fill",
            withConfiguration: UIImage.SymbolConfiguration(weight: .regular)
        )?.withTintColor(.systemPink, renderingMode: .alwaysOriginal)

        return mapView
    }

    func updateUIView(_ mapView: MKMapView, context: Context) {
        let coordinator = context.coordinator

        // Keep map style in sync with the AppSettings choice.
        // Compare class identities to avoid reapplying (and flickering) every frame.
        let currentClass = ObjectIdentifier(type(of: mapView.preferredConfiguration))
        let desiredClass = ObjectIdentifier(type(of: mapStyle.configuration))
        if currentClass != desiredClass {
            mapView.preferredConfiguration = mapStyle.configuration
        }

        // Update renderer data
        if let renderer = coordinator.overlayRenderer {
            renderer.mapData = parkingLot.map
            renderer.favorites = Set(favoritesManager.favorites)
            renderer.selectedSpot = selectedSpotNumber
            renderer.showSpotNumbers = showSpotNumbers
            renderer.showHandicapIndicator = showHandicapIndicator
            renderer.availableColor = colorTheme.availableUIColor
            renderer.occupiedColor  = colorTheme.occupiedUIColor
            renderer.handicapColor  = colorTheme.handicapUIColor
            renderer.setNeedsDisplay()
        }

        // Handle navigate-to-spot
        if let spotNum = navigateToSpot {
            DispatchQueue.main.async {
                self.navigateToSpot = nil
            }

            if spotNum == -1 {
                // Reset to default view
                mapView.setCamera(ParkingLotGeo.defaultCamera, animated: true)
            } else if let pos = ParkingLotMap.position(forSpotNumber: spotNum) {
                let coord = ParkingLotGeo.coordinate(forRow: pos.row, col: pos.col)
                let camera = MKMapCamera(
                    lookingAtCenter: coord,
                    fromDistance: ParkingLotGeo.zoomedInAltitude,
                    pitch: 0,
                    // Stay aligned with the lot so it doesn't snap back to north-up
                    // mid-animation. The lot reads vertical/parallel the whole way.
                    heading: ParkingLotGeo.defaultHeading
                )
                mapView.setCamera(camera, animated: true)
            }
        }
    }

    // MARK: - Coordinator

    class Coordinator: NSObject, MKMapViewDelegate {
        let parent: ParkingLotMapView
        var parkingOverlay: ParkingLotOverlay?
        var overlayRenderer: ParkingLotOverlayRenderer?
        var parkingMarker: ParkingLotMarker?

        /// Camera altitude (meters) above which the far-zoom marker appears.
        /// Default lot view is ~460m; doubling that makes the lot barely visible.
        private let markerVisibilityAltitude: Double = 950

        init(parent: ParkingLotMapView) {
            self.parent = parent
            super.init()
        }

        // MARK: Marker visibility

        func updateMarkerVisibility(on mapView: MKMapView) {
            guard let marker = parkingMarker else { return }
            let isFarOut = mapView.camera.altitude > markerVisibilityAltitude
            let isShown  = mapView.annotations.contains(where: { $0 === marker })

            if isFarOut && !isShown {
                mapView.addAnnotation(marker)
            } else if !isFarOut && isShown {
                mapView.removeAnnotation(marker)
            }
        }

        // MARK: MKMapViewDelegate

        func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
            updateMarkerVisibility(on: mapView)
        }

        func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard annotation is ParkingLotMarker else { return nil }
            let id = "ParkingLotMarker"
            let view: MKMarkerAnnotationView = {
                if let v = mapView.dequeueReusableAnnotationView(withIdentifier: id) as? MKMarkerAnnotationView {
                    v.annotation = annotation
                    return v
                }
                return MKMarkerAnnotationView(annotation: annotation, reuseIdentifier: id)
            }()
            view.markerTintColor = UIColor(parent.colorTheme.accent)
            view.glyphImage = UIImage(systemName: "car.fill")
            view.canShowCallout = true
            view.titleVisibility = .visible
            view.subtitleVisibility = .adaptive
            view.displayPriority = .required
            return view
        }

        // Tap on the marker → fly back to the lot.
        func mapView(_ mapView: MKMapView, didSelect view: MKAnnotationView) {
            guard view.annotation is ParkingLotMarker else { return }
            mapView.setCamera(ParkingLotGeo.defaultCamera, animated: true)
            mapView.deselectAnnotation(view.annotation, animated: false)
        }

        func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            if overlay is ParkingLotOverlay {
                let renderer = ParkingLotOverlayRenderer(overlay: overlay)
                renderer.mapData = parent.parkingLot.map
                renderer.favorites = Set(parent.favoritesManager.favorites)
                renderer.selectedSpot = parent.selectedSpotNumber
                renderer.showSpotNumbers = parent.showSpotNumbers
                renderer.showHandicapIndicator = parent.showHandicapIndicator

                // Pre-render SF Symbol images
                renderer.handicapImage = UIImage(
                    systemName: "figure.roll",
                    withConfiguration: UIImage.SymbolConfiguration(weight: .bold)
                )?.withTintColor(.white, renderingMode: .alwaysOriginal)

                renderer.heartImage = UIImage(
                    systemName: "heart.fill",
                    withConfiguration: UIImage.SymbolConfiguration(weight: .regular)
                )?.withTintColor(.systemPink, renderingMode: .alwaysOriginal)

                self.overlayRenderer = renderer
                return renderer
            }
            return MKOverlayRenderer(overlay: overlay)
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let mapView = gesture.view as? MKMapView else { return }
            let point = gesture.location(in: mapView)
            let coord = mapView.convert(point, toCoordinateFrom: mapView)

            // gridPosition inverts the parallelogram mapping directly, so no
            // separate un-rotation step is needed.
            guard let pos = ParkingLotGeo.gridPosition(forCoordinate: coord) else { return }

            let map = parent.parkingLot.map
            guard map.isValidPosition(row: pos.row, col: pos.col) else { return }

            let spot = map.map[pos.row][pos.col]
            guard spot.status != .notASpot else { return }

            // Check it's not a grass position
            let grassPositions: Set<String> = [
                "1-0", "1-1", "1-2", "1-19", "1-20", "1-21",
                "3-0", "3-1", "3-2", "3-19", "3-20", "3-21",
            ]
            guard !grassPositions.contains("\(pos.row)-\(pos.col)") else { return }

            if let spotNum = ParkingLotMap.spotNumber(forRow: pos.row, col: pos.col), spotNum > 0 {
                parent.selectedSpotNumber = spotNum
            }
        }
    }
}
