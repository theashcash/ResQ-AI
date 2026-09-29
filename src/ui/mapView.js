// src/ui/mapView.js

import {
    NODES,
    EDGES,
    STATIONS
} from "../data/city.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const NODE_RADIUS = 18;


// ==========================================
// Traffic / road appearance
// ==========================================

function trafficColor(edge) {

    if (edge.blocked) {
        return "#888888";
    }

    if (edge.traffic === 0) {
        return "#2ecc71";
    }

    if (edge.traffic === 1) {
        return "#f1c40f";
    }

    return "#e74c3c";
}


// ==========================================
// Station icon
// ==========================================

function stationLabel(nodeId) {

    if (STATIONS.hospital.includes(nodeId)) {
        return "🏥";
    }

    if (STATIONS.fire_station.includes(nodeId)) {
        return "🚒";
    }

    if (STATIONS.police_station.includes(nodeId)) {
        return "🚓";
    }

    return null;
}


// ==========================================
// Create base SVG map
// ==========================================

export function renderMap(
    container,
    onEdgeClick
) {

    container.innerHTML = "";


    const svg = document.createElementNS(
        SVG_NS,
        "svg"
    );

    svg.setAttribute(
        "viewBox",
        "0 0 800 600"
    );

    svg.setAttribute(
        "width",
        "100%"
    );

    svg.setAttribute(
        "height",
        "100%"
    );


    container.appendChild(svg);


    // ======================================
    // Roads
    // ======================================

    for (const edge of EDGES) {

        const from = NODES[edge.from];
        const to = NODES[edge.to];


        const line = document.createElementNS(
            SVG_NS,
            "line"
        );


        line.setAttribute("x1", from.x);
        line.setAttribute("y1", from.y);

        line.setAttribute("x2", to.x);
        line.setAttribute("y2", to.y);

        line.setAttribute(
            "stroke",
            trafficColor(edge)
        );

        line.setAttribute(
            "stroke-width",
            "6"
        );

        line.setAttribute(
            "stroke-linecap",
            "round"
        );


        if (edge.blocked) {

            line.setAttribute(
                "stroke-dasharray",
                "10,8"
            );
        }


        line.style.cursor = "pointer";


        line.dataset.from = edge.from;
        line.dataset.to = edge.to;


        line.addEventListener(
            "click",
            () => onEdgeClick(edge)
        );


        svg.appendChild(line);
    }


    // ======================================
    // Nodes
    // ======================================

    for (const [id, node] of Object.entries(NODES)) {

        const circle =
            document.createElementNS(
                SVG_NS,
                "circle"
            );


        circle.setAttribute(
            "cx",
            node.x
        );

        circle.setAttribute(
            "cy",
            node.y
        );

        circle.setAttribute(
            "r",
            NODE_RADIUS
        );

        circle.setAttribute(
            "fill",
            "#2c3e50"
        );

        circle.setAttribute(
            "stroke",
            "#ffffff"
        );

        circle.setAttribute(
            "stroke-width",
            "2"
        );


        svg.appendChild(circle);


        // Node ID

        const label =
            document.createElementNS(
                SVG_NS,
                "text"
            );


        label.setAttribute(
            "x",
            node.x
        );

        label.setAttribute(
            "y",
            node.y + 4
        );

        label.setAttribute(
            "text-anchor",
            "middle"
        );

        label.setAttribute(
            "fill",
            "#ffffff"
        );

        label.setAttribute(
            "font-size",
            "12"
        );

        label.textContent = id;


        svg.appendChild(label);


        // Station icon

        const badge = stationLabel(id);


        if (badge) {

            const stationText =
                document.createElementNS(
                    SVG_NS,
                    "text"
                );


            stationText.setAttribute(
                "x",
                node.x
            );

            stationText.setAttribute(
                "y",
                node.y - NODE_RADIUS - 8
            );

            stationText.setAttribute(
                "text-anchor",
                "middle"
            );

            stationText.setAttribute(
                "font-size",
                "18"
            );

            stationText.textContent = badge;


            svg.appendChild(stationText);
        }
    }


    // ======================================
    // Overlay layer
    // ======================================

    const overlay =
        document.createElementNS(
            SVG_NS,
            "g"
        );

    overlay.setAttribute(
        "id",
        "overlay-layer"
    );

    svg.appendChild(overlay);


    return svg;
}


// ==========================================
// Update road colours
// ==========================================

export function updateRoads(svg) {

    for (
        const line of svg.querySelectorAll("line")
    ) {

        if (
            !line.dataset.from ||
            !line.dataset.to
        ) {
            continue;
        }


        const edge = EDGES.find(
            edge =>
                edge.from === line.dataset.from &&
                edge.to === line.dataset.to
        );


        if (!edge) {
            continue;
        }


        line.setAttribute(
            "stroke",
            trafficColor(edge)
        );


        line.setAttribute(
            "stroke-dasharray",
            edge.blocked
                ? "10,8"
                : ""
        );
    }
}


// ==========================================
// Remove all route highlights
// ==========================================

export function clearRoutes(svg) {

    const overlay =
        svg.querySelector("#overlay-layer");

    if (!overlay) {
        return;
    }


    overlay
        .querySelectorAll(".route-highlight")
        .forEach(
            element => element.remove()
        );
}


// ==========================================
// Draw ONE route
// ==========================================

export function drawRoute(
    svg,
    path,
    color = "#3498db"
) {

    const overlay =
        svg.querySelector("#overlay-layer");


    if (!overlay) {
        return;
    }


    if (!path || path.length < 2) {
        return;
    }


    for (
        let i = 0;
        i < path.length - 1;
        i++
    ) {

        const from = NODES[path[i]];
        const to = NODES[path[i + 1]];


        if (!from || !to) {
            continue;
        }


        const line =
            document.createElementNS(
                SVG_NS,
                "line"
            );


        line.setAttribute(
            "x1",
            from.x
        );

        line.setAttribute(
            "y1",
            from.y
        );

        line.setAttribute(
            "x2",
            to.x
        );

        line.setAttribute(
            "y2",
            to.y
        );


        line.setAttribute(
            "stroke",
            color
        );

        line.setAttribute(
            "stroke-width",
            "4"
        );

        line.setAttribute(
            "stroke-linecap",
            "round"
        );

        line.setAttribute(
            "class",
            "route-highlight"
        );

        line.setAttribute(
            "pointer-events",
            "none"
        );


        overlay.appendChild(line);
    }
}


// ==========================================
// Draw MULTIPLE routes
// ==========================================

export function drawRoutes(
    svg,
    assignments
) {

    clearRoutes(svg);


    if (!assignments) {
        return;
    }


    const routeColors = [
        "#3498db",
        "#9b59b6",
        "#1abc9c",
        "#f39c12",
        "#e67e22",
        "#e74c3c"
    ];


    assignments.forEach(
        (assignment, index) => {

            drawRoute(
                svg,
                assignment.path,
                routeColors[
                    index % routeColors.length
                ]
            );
        }
    );
}


// ==========================================
// Draw / move vehicle
// ==========================================

export function drawVehicle(
    svg,
    vehicle
) {

    const overlay =
        svg.querySelector("#overlay-layer");


    if (!overlay) {
        return;
    }


    const node =
        NODES[vehicle.node];


    if (!node) {
        return;
    }


    let marker =
        svg.querySelector(
            `[data-vehicle-id="${vehicle.id}"]`
        );


    if (!marker) {

        marker =
            document.createElementNS(
                SVG_NS,
                "text"
            );


        marker.setAttribute(
            "font-size",
            "20"
        );


        marker.setAttribute(
            "text-anchor",
            "middle"
        );


        marker.dataset.vehicleId =
            vehicle.id;


        overlay.appendChild(marker);
    }


    const icon =
        vehicle.type === "ambulance"
            ? "🚑"
            : vehicle.type === "fire_truck"
                ? "🚒"
                : "🚓";


    marker.textContent = icon;


    marker.setAttribute(
        "x",
        node.x
    );

    marker.setAttribute(
        "y",
        node.y - NODE_RADIUS - 20
    );
}


// ==========================================
// Remove vehicle marker
// ==========================================

export function removeVehicleMarker(
    svg,
    vehicleId
) {

    const marker =
        svg.querySelector(
            `[data-vehicle-id="${vehicleId}"]`
        );


    if (marker) {
        marker.remove();
    }
}