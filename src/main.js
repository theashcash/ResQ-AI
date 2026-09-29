// ==========================================
// RESQ-AI MAIN APPLICATION
// ==========================================

import {
    inferResources
} from "./engine/inference.js";

import {
    dispatch,
    resetAllVehicles,
    releaseVehicle
} from "./engine/dispatch.js";

import {
    needsReroute,
    reroute
} from "./engine/reroute.js";

import {
    NODES,
    EDGES
} from "./data/city.js";

import {
    VEHICLES
} from "./data/vehicles.js";

import {
    renderIncidentForm,
    populateNodeOptions,
    renderEdgeControls
} from "./ui/controls.js";

import {
    renderMap,
    updateRoads,
    drawRoutes,
    drawVehicle,
    removeVehicleMarker,
    clearRoutes,
    showIncident,
    clearIncident
} from "./ui/mapView.js";

import {
    renderResults,
    showRerouteEvent
} from "./ui/panel.js";


// ==========================================
// DOM ELEMENTS
// ==========================================

const formContainer =
    document.getElementById("form");

const mapContainer =
    document.getElementById("map");

const resultsContainer =
    document.getElementById("results");

const edgeControlsContainer =
    document.getElementById("edge-controls");

const resetButton =
    document.getElementById("reset");


// ==========================================
// APPLICATION STATE
// ==========================================

let svg = null;

let currentIncident = null;

let currentAssignments = [];


// ==========================================
// HOME LOCATIONS
// ==========================================
//
// Store the original station of every vehicle.
// This lets Reset return vehicles home.

const HOME = Object.fromEntries(
    VEHICLES.map(vehicle => [
        vehicle.id,
        vehicle.node
    ])
);


// ==========================================
// RENDER ALL VEHICLES
// ==========================================

function drawAllVehicles() {

    for (const vehicle of VEHICLES) {

        drawVehicle(
            svg,
            vehicle
        );
    }
}


// ==========================================
// RESET FLEET
// ==========================================

function resetFleet() {

    resetAllVehicles();


    // Return every vehicle to its
    // original emergency station.

    for (const vehicle of VEHICLES) {

        vehicle.node =
            HOME[vehicle.id];
    }


    // Clear visual state

    clearRoutes(svg);

    clearIncident(svg);


    // Redraw vehicles

    drawAllVehicles();
}


// ==========================================
// INITIALISE MAP
// ==========================================

svg = renderMap(
    mapContainer,
    handleEdgeClick
);


// ==========================================
// INITIALISE INCIDENT FORM
// ==========================================

renderIncidentForm(
    formContainer,
    handleIncidentSubmit
);

populateNodeOptions(NODES);


// ==========================================
// INITIAL VEHICLE STATE
// ==========================================

drawAllVehicles();


// ==========================================
// INCIDENT SUBMISSION
// ==========================================

function handleIncidentSubmit(incident) {

    // --------------------------------------
    // Reset previous incident
    // --------------------------------------

    resetFleet();


    currentIncident =
        incident;


    // --------------------------------------
    // Show incident on map
    // --------------------------------------

    showIncident(
        svg,
        incident.node
    );


    // --------------------------------------
    // AI INFERENCE
    // --------------------------------------

    const plan =
        inferResources(
            incident
        );


    console.log(
        "AI inference:",
        plan
    );


    // --------------------------------------
    // DISPATCH
    // --------------------------------------

    const result =
        dispatch(
            plan.needs,
            incident.node
        );


    console.log(
        "Dispatch:",
        result
    );


    currentAssignments =
        result.assignments;


    // --------------------------------------
    // Render response panel
    // --------------------------------------

    renderResults(
        resultsContainer,
        incident,
        plan,
        result
    );


    // --------------------------------------
    // Draw routes
    // --------------------------------------

    drawRoutes(
        svg,
        currentAssignments
    );


    // --------------------------------------
    // Draw dispatched vehicles
    // --------------------------------------

    for (const assignment of result.assignments) {

        const vehicle =
            VEHICLES.find(
                v =>
                    v.id ===
                    assignment.vehicleId
            );


        if (vehicle) {

            drawVehicle(
                svg,
                vehicle
            );
        }
    }
}


// ==========================================
// ROAD CLICK HANDLER
// ==========================================

function handleEdgeClick(edge) {

    renderEdgeControls(
        edgeControlsContainer,
        edge,
        () => {

            // Update road colours

            updateRoads(svg);


            // Check whether any active
            // vehicle needs a new route.

            checkActiveVehicles();
        }
    );
}


// ==========================================
// SYNC ROUTE WITH VEHICLE
// ==========================================
//
// As the vehicle moves, remove the nodes
// it has already travelled from its route.

function syncRoute(vehicle) {

    const assignment =
        currentAssignments.find(
            a =>
                a.vehicleId ===
                vehicle.id
        );


    if (assignment) {

        assignment.path =
            [...vehicle.path];
    }


    drawRoutes(
        svg,
        currentAssignments
    );
}


// ==========================================
// CHECK ACTIVE VEHICLES
// ==========================================

function checkActiveVehicles() {

    if (!currentIncident) {
        return;
    }


    for (const vehicle of VEHICLES) {

        if (
            vehicle.status !==
            "dispatched"
        ) {
            continue;
        }


        if (
            !vehicle.path ||
            vehicle.path.length < 2
        ) {
            continue;
        }


        if (
            needsReroute(
                vehicle,
                EDGES
            )
        ) {

            const newRoute =
                reroute(
                    vehicle,
                    currentIncident.node
                );


            // ----------------------------------
            // No route available
            // ----------------------------------

            if (newRoute === null) {

                showRerouteEvent(
                    resultsContainer,
                    vehicle.id,
                    ["NO ROUTE"]
                );

                continue;
            }


            // ----------------------------------
            // Apply new route
            // ----------------------------------

            vehicle.path =
                [...newRoute.path];


            const assignment =
                currentAssignments.find(
                    a =>
                        a.vehicleId ===
                        vehicle.id
                );


            if (assignment) {

                assignment.path =
                    [...newRoute.path];

                assignment.cost =
                    newRoute.cost;
            }


            // ----------------------------------
            // Notify user
            // ----------------------------------

            showRerouteEvent(
                resultsContainer,
                vehicle.id,
                newRoute.path
            );


            // ----------------------------------
            // Update map
            // ----------------------------------

            drawRoutes(
                svg,
                currentAssignments
            );

            drawVehicle(
                svg,
                vehicle
            );
        }
    }
}


// ==========================================
// MOVE ONE VEHICLE
// ==========================================

function moveVehicle(vehicle) {

    if (
        vehicle.status !==
        "dispatched"
    ) {
        return;
    }


    // No remaining route

    if (
        !vehicle.path ||
        vehicle.path.length < 2
    ) {
        return;
    }


    // --------------------------------------
    // Check for blocked next road
    // --------------------------------------

    if (
        needsReroute(
            vehicle,
            EDGES
        )
    ) {

        if (!currentIncident) {
            return;
        }


        const newRoute =
            reroute(
                vehicle,
                currentIncident.node
            );


        if (newRoute === null) {

            showRerouteEvent(
                resultsContainer,
                vehicle.id,
                ["NO ROUTE"]
            );

            return;
        }


        vehicle.path =
            [...newRoute.path];


        const assignment =
            currentAssignments.find(
                a =>
                    a.vehicleId ===
                    vehicle.id
            );


        if (assignment) {

            assignment.path =
                [...newRoute.path];

            assignment.cost =
                newRoute.cost;
        }


        showRerouteEvent(
            resultsContainer,
            vehicle.id,
            newRoute.path
        );


        drawRoutes(
            svg,
            currentAssignments
        );


        drawVehicle(
            svg,
            vehicle
        );


        return;
    }


    // --------------------------------------
    // Move to next node
    // --------------------------------------

    const nextNode =
        vehicle.path[1];


    vehicle.node =
        nextNode;


    vehicle.path.shift();


    // --------------------------------------
    // Update visual position
    // --------------------------------------

    drawVehicle(
        svg,
        vehicle
    );


    // --------------------------------------
    // Update displayed route
    // --------------------------------------

    syncRoute(
        vehicle
    );


    // --------------------------------------
    // Arrival
    // --------------------------------------

    if (
        currentIncident &&
        vehicle.node ===
        currentIncident.node
    ) {

        console.log(
            `${vehicle.id} arrived at ${vehicle.node}`
        );


        vehicle.path = [
            vehicle.node
        ];


        syncRoute(
            vehicle
        );


        // Vehicle is now free again.
        // It remains at the incident location
        // until Reset sends it home.

        releaseVehicle(
            vehicle.id
        );


        drawVehicle(
            svg,
            vehicle
        );
    }
}


// ==========================================
// MOVE ALL VEHICLES
// ==========================================

function moveAllVehicles() {

    for (const vehicle of VEHICLES) {

        moveVehicle(
            vehicle
        );
    }
}


// ==========================================
// RESET BUTTON
// ==========================================

if (resetButton) {

    resetButton.addEventListener(
        "click",
        () => {

            resetFleet();

            currentIncident =
                null;

            currentAssignments =
                [];

            resultsContainer.innerHTML =
                "";

            edgeControlsContainer.innerHTML =
                "";

            updateRoads(svg);
        }
    );
}


// ==========================================
// AUTOMATIC SIMULATION
// ==========================================
//
// Every second, each dispatched vehicle
// moves one graph edge.

const simulationTimer =
    setInterval(
        moveAllVehicles,
        1000
    );


// ==========================================
// DEVELOPMENT API
// ==========================================
//
// Useful from the browser console:
//
// RESQ.moveAllVehicles()
// RESQ.checkActiveVehicles()
// RESQ.reset()
// RESQ.getVehicles()
// RESQ.getEdges()

window.RESQ = {

    moveVehicle,

    moveAllVehicles,

    checkActiveVehicles,

    reset: () => {

        resetFleet();

        currentIncident =
            null;

        currentAssignments =
            [];

        resultsContainer.innerHTML =
            "";

        edgeControlsContainer.innerHTML =
            "";

        updateRoads(svg);
    },

    releaseVehicle,

    getVehicles: () =>
        VEHICLES,

    getEdges: () =>
        EDGES,

    getIncident: () =>
        currentIncident,

    getAssignments: () =>
        currentAssignments
};


// ==========================================
// STARTUP
// ==========================================

console.log(
    "🚨 RESQ-AI initialized."
);

console.log(
    "Submit an incident to begin."
);