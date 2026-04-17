//
//  ParkingLotGeoConstants.swift
//  SpotSense Senior Project
//
//  Created by Xander Angulo, Maden Edaugal on 1/4/26.
//
//  Geographic constants and conversion math used to anchor the parking lot
//  overlay onto Apple Maps. This file owns:
//
//   • The latitude/longitude of the four physical corners of the lot.
//   • Derived helpers that compute the lot's center, rotation heading, and
//     the axis-aligned `MKMapRect` used by the overlay renderer.
//   • Bidirectional grid-to-coordinate conversions used both for rendering
//     spots and for translating user taps back into a `(row, col)` pair.
//
//  All coordinate math here is kept in sync with the renderer's draw
//  transform (axis-aligned rectangle centered on the lot, then rotated by
//  `rotationRadians`). Updating the corners here automatically updates
//  rotation, scale, and tap-detection across the entire app.
//

import Foundation
import MapKit

enum ParkingLotGeo {
    // MARK: - Lot Corner Coordinates (HCU Main Parking Lot)
    // These define the geographic rectangle the overlay covers.
    // Adjust these to align the overlay with the real lot on satellite view.

    // Northwest corner (top-left of grid, near spot 4)
    static let northwestLat: Double = 29.695156
    static let northwestLon: Double = -95.515224

    // Northeast corner (top-right of grid, near spot 19)
    static let northeastLat: Double = 29.695653
    static let northeastLon: Double = -95.514837

    // Southwest corner (bottom-left of grid, near spot 287)
    static let southwestLat: Double = 29.694551
    static let southwestLon: Double = -95.514021

    // Southeast corner (bottom-right of grid, near spot 308)
    static let southeastLat: Double = 29.695093
    static let southeastLon: Double = -95.513673

    // MARK: - Derived Properties

    /// Rotation angle derived from the NW→NE edge direction.
    /// Computed in MKMapPoint (Y-DOWN) frame so it matches CGContext rotation.
    /// No manual angle needed — just set the 4 corners and this follows.
    static var rotationRadians: Double {
        let nw = MKMapPoint(northwestCoord)
        let ne = MKMapPoint(northeastCoord)
        let dx = ne.x - nw.x        // positive: east
        let dy = ne.y - nw.y        // negative: north (Y-down in MKMapPoint)
        return atan2(dy, dx)        // angle of the top edge in CGContext frame
    }

    static var centerCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude:  (northwestLat + northeastLat + southwestLat + southeastLat) / 4.0,
            longitude: (northwestLon + northeastLon + southwestLon + southeastLon) / 4.0
        )
    }

    static var northwestCoord: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: northwestLat, longitude: northwestLon)
    }

    static var northeastCoord: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: northeastLat, longitude: northeastLon)
    }

    static var southwestCoord: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: southwestLat, longitude: southwestLon)
    }

    static var southeastCoord: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: southeastLat, longitude: southeastLon)
    }

    // MARK: - MKMapRect for the overlay bounds

    /// Axis-aligned rect used for drawing dimensions (before rotation).
    /// Width = actual top-edge length (NW→NE distance).
    /// Height = actual left-edge length (NW→SW distance).
    /// Centered on the lot center so rotation about the center re-aligns it with the lot.
    static var overlayMapRect: MKMapRect {
        let nw = MKMapPoint(northwestCoord)
        let ne = MKMapPoint(northeastCoord)
        let sw = MKMapPoint(southwestCoord)
        let se = MKMapPoint(southeastCoord)
        let centerX = (nw.x + ne.x + sw.x + se.x) / 4.0
        let centerY = (nw.y + ne.y + sw.y + se.y) / 4.0
        let topEdgeLength = hypot(ne.x - nw.x, ne.y - nw.y)
        let leftEdgeLength = hypot(sw.x - nw.x, sw.y - nw.y)
        return MKMapRect(
            x: centerX - topEdgeLength / 2.0,
            y: centerY - leftEdgeLength / 2.0,
            width: topEdgeLength,
            height: leftEdgeLength
        )
    }

    /// Expanded bounding rect that contains the rotated overlay (for MapKit clipping).
    static var expandedOverlayMapRect: MKMapRect {
        let points = [northwestCoord, northeastCoord, southwestCoord, southeastCoord].map { MKMapPoint($0) }
        let xs = points.map { $0.x }
        let ys = points.map { $0.y }
        let minX = xs.min()!, maxX = xs.max()!
        let minY = ys.min()!, maxY = ys.max()!
        let w = maxX - minX, h = maxY - minY
        // Pad by 20% to ensure no clipping after rotation
        return MKMapRect(x: minX - w * 0.1, y: minY - h * 0.1, width: w * 1.2, height: h * 1.2)
    }

    // MARK: - Default Camera

    static let defaultAltitude: CLLocationDistance = 460
    static let zoomedInAltitude: CLLocationDistance = 80

    /// Camera heading (compass degrees) that makes the lot's top edge appear
    /// horizontal on screen — i.e. the long axis of the lot runs up–down,
    /// which is what users expect ("vertical").
    static var defaultHeading: CLLocationDirection {
        let cosLat = cos(northwestLat * .pi / 180.0)
        let dlon = (northeastLon - northwestLon) * cosLat
        let dlat = northeastLat - northwestLat
        // Bearing of NW→NE (top edge) measured clockwise from north
        let bearingRad = atan2(dlon, dlat)
        let bearingDeg = bearingRad * 180 / .pi
        // For the top edge to point right on screen, "up" on screen is 90° CCW from it
        var heading = bearingDeg - 90.0
        if heading < 0 { heading += 360 }
        return heading
    }

    static var defaultCamera: MKMapCamera {
        MKMapCamera(
            lookingAtCenter: centerCoordinate,
            fromDistance: defaultAltitude,
            pitch: 0,
            heading: defaultHeading
        )
    }

    // MARK: - Grid Dimensions (must match ParkingLotMap layout)

    static let gridCols = ParkingLotMap.spotsPerRow   // 22
    static let gridRows = ParkingLotMap.totalRows      // 22

    // The grid's point dimensions (used for proportional mapping)
    static let gridPointWidth: CGFloat = ParkingLotLayout.roadWidth + CGFloat(gridCols) * ParkingLotLayout.spotWidth + ParkingLotLayout.roadWidth  // 728
    static let gridPointHeight: CGFloat = {
        // grass(56) + 14 parking rows(48 each) + 7 driving lanes(56 each)
        let grassAndLanes: CGFloat = 8 * ParkingLotLayout.laneHeight  // 0,2,5,8,11,14,17,20
        let parkingRows: CGFloat = 14 * ParkingLotLayout.spotHeight
        return grassAndLanes + parkingRows
    }()

    // MARK: - Coordinate Conversion

    /// Convert a grid (x, y) point to a geographic coordinate.
    ///
    /// Uses the SAME math as the renderer (axis-aligned `overlayMapRect` centered
    /// on the lot center, then rotated by `rotationRadians` around that center).
    /// This guarantees that the spot at grid (x, y) renders at exactly the same
    /// screen location that this function points to — so taps and visible spots
    /// agree, and `navigateToSpot(...)` lands on the visible spot.
    static func coordinate(forGridX x: CGFloat, gridY y: CGFloat) -> CLLocationCoordinate2D {
        let nw = MKMapPoint(northwestCoord)
        let ne = MKMapPoint(northeastCoord)
        let sw = MKMapPoint(southwestCoord)
        let topEdge  = hypot(ne.x - nw.x, ne.y - nw.y)
        let leftEdge = hypot(sw.x - nw.x, sw.y - nw.y)

        let center = MKMapPoint(centerCoordinate)

        // Position in the axis-aligned overlay rect, with origin at the rect center.
        let localX = (Double(x) / Double(gridPointWidth))  * topEdge  - topEdge  / 2
        let localY = (Double(y) / Double(gridPointHeight)) * leftEdge - leftEdge / 2

        // Rotate by the same heading the renderer rotates by.
        let cosA = cos(rotationRadians)
        let sinA = sin(rotationRadians)
        let rotX = localX * cosA - localY * sinA
        let rotY = localX * sinA + localY * cosA

        return MKMapPoint(x: center.x + rotX, y: center.y + rotY).coordinate
    }

    /// Convert a spot's (row, col) to a geographic coordinate using ParkingLotMap.centerPoint.
    static func coordinate(forRow row: Int, col: Int) -> CLLocationCoordinate2D {
        let pt = ParkingLotMap.centerPoint(forRow: row, col: col)
        return coordinate(forGridX: pt.x, gridY: pt.y)
    }

    /// Convert a geographic coordinate to grid (x, y) point coordinates.
    ///
    /// Inverts the renderer's draw transform exactly: counter-rotate around the
    /// lot center, then read x/y inside the axis-aligned overlay rect. Because
    /// the renderer draws the lot as a rectangle (not a parallelogram), tap
    /// detection MUST do the same to avoid off-by-one selection.
    /// Returns nil if the coordinate falls outside the lot.
    static func gridPoint(forCoordinate coord: CLLocationCoordinate2D) -> CGPoint? {
        let nw = MKMapPoint(northwestCoord)
        let ne = MKMapPoint(northeastCoord)
        let sw = MKMapPoint(southwestCoord)
        let topEdge  = hypot(ne.x - nw.x, ne.y - nw.y)
        let leftEdge = hypot(sw.x - nw.x, sw.y - nw.y)
        guard topEdge > 0, leftEdge > 0 else { return nil }

        let center = MKMapPoint(centerCoordinate)
        let p = MKMapPoint(coord)

        // Translate so the lot center is the origin.
        let dx = p.x - center.x
        let dy = p.y - center.y

        // Counter-rotate by -rotationRadians to undo the renderer's rotation.
        let angle = -rotationRadians
        let cosA = cos(angle)
        let sinA = sin(angle)
        let localX = dx * cosA - dy * sinA
        let localY = dx * sinA + dy * cosA

        // Convert from "centered" local coords to "top-left origin" overlay coords.
        let relX = localX + topEdge  / 2
        let relY = localY + leftEdge / 2

        let fracX = relX / topEdge
        let fracY = relY / leftEdge

        // Allow small tolerance for taps right on the lot edge.
        let tolerance = 0.05
        guard fracX >= -tolerance, fracX <= 1 + tolerance,
              fracY >= -tolerance, fracY <= 1 + tolerance else { return nil }

        return CGPoint(
            x: CGFloat(fracX) * gridPointWidth,
            y: CGFloat(fracY) * gridPointHeight
        )
    }

    /// Convert a geographic coordinate to the nearest parking spot (row, col).
    /// Returns nil if outside the lot or on a driving lane.
    static func gridPosition(forCoordinate coord: CLLocationCoordinate2D) -> (row: Int, col: Int)? {
        guard let pt = gridPoint(forCoordinate: coord) else { return nil }

        // Subtract road width to get into parking area
        let parkingX = pt.x - ParkingLotLayout.roadWidth
        guard parkingX >= 0 else { return nil }

        let col = Int(parkingX / ParkingLotLayout.spotWidth)
        guard col >= 0, col < ParkingLotMap.spotsPerRow else { return nil }

        // Find the row by checking y against the aisle layout
        let row = findRow(forY: pt.y)
        guard row >= 0, row < ParkingLotMap.totalRows else { return nil }

        return (row, col)
    }

    /// Reverse-rotate a geographic coordinate back to the axis-aligned grid frame.
    /// Used for tap handling — undoes the visual rotation so grid lookup works.
    static func unrotatedCoordinate(from coord: CLLocationCoordinate2D) -> CLLocationCoordinate2D {
        let center = centerCoordinate
        let cosLat = cos(center.latitude * .pi / 180.0)
        let dx = (coord.longitude - center.longitude) * cosLat
        let dy = coord.latitude - center.latitude
        let angle = -rotationRadians // undo the rotation
        let cosA = cos(angle)
        let sinA = sin(angle)
        let rx = dx * cosA - dy * sinA
        let ry = dx * sinA + dy * cosA
        return CLLocationCoordinate2D(
            latitude:  center.latitude + ry,
            longitude: center.longitude + rx / cosLat
        )
    }

    /// Find the grid row index for a given y coordinate.
    private static func findRow(forY y: CGFloat) -> Int {
        // Walk through the layout to find which row the y coordinate falls in
        var currentY: CGFloat = 0

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

        // Row 0: grass lane
        currentY += ParkingLotLayout.laneHeight
        if y < currentY { return 0 }

        for aisle in aisles {
            // Top row
            let topEnd = currentY + ParkingLotLayout.spotHeight
            if y >= currentY && y < topEnd { return aisle.top }
            currentY = topEnd

            // Bottom row
            if let bottom = aisle.bottom {
                let bottomEnd = currentY + ParkingLotLayout.spotHeight
                if y >= currentY && y < bottomEnd { return bottom }
                currentY = bottomEnd
            }

            // Driving lane
            if aisle.lane != nil {
                currentY += ParkingLotLayout.laneHeight
            }
        }

        return -1
    }
}
