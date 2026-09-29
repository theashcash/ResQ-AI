// src/main.js

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
    removeVehicleMarker
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


// ==========================================
// APPLICATION STATE
// ==========================================

let svg = null;

let currentIncident = null;

let currentAssignments = [];


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
// DRAW INITIAL VEHICLES
// ==========================================

function drawAllVehicles() {

    for (const vehicle of VEHICLES) {

        drawVehicle(
            svg,
            vehicle
        );
    }
}

drawAllVehicles();


// ==========================================
// INCIDENT SUBMISSION
// ==========================================

function handleIncidentSubmit(
    incident
) {

    console.log(
        "New incident:",
        incident
    );


    // --------------------------------------
    // Reset previous simulation state
    // --------------------------------------

    resetAllVehicles();

    currentIncident = incident;


    // Remove old vehicle markers/routes

    for (const vehicle of VEHICLES) {

        removeVehicleMarker(
            svg,
            vehicle.id
        );
    }


    drawAllVehicles();


    // --------------------------------------
    // AI inference
    // --------------------------------------

    const plan =
        inferResources(
            incident
        );


    console.log(
        "Inference plan:",
        plan
    );


    // --------------------------------------
    // Dispatch
    // --------------------------------------

    const result =
        dispatch(
            plan.needs,
            incident.node
        );


    console.log(
        "Dispatch result:",
        result
    );


    currentAssignments =
        result.assignments;


    // --------------------------------------
    // Show results
    // --------------------------------------

    renderResults(
        resultsContainer,
        incident,
        plan,
        result
    );


    // --------------------------------------
    // Highlight dispatched routes
    // --------------------------------------

    drawRoutes(
        svg,
        result.assignments
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
// ROAD CLICK
// ==========================================

function handleEdgeClick(edge) {

    renderEdgeControls(
        edgeControlsContainer,
        edge,
        () => {

            // Update road appearance

            updateRoads(svg);


            // If a vehicle is currently travelling,
            // check whether its next road is blocked.

            checkActiveVehicles();
        }
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


            // ----------------------------------
            // Update assignment
            // ----------------------------------

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
            // Show alert
            // ----------------------------------

            showRerouteEvent(
                resultsContainer,
                vehicle.id,
                newRoute.path
            );


            // ----------------------------------
            // Redraw routes
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

function moveVehicle(
    vehicle
) {

    if (
        vehicle.status !==
        "dispatched"
    ) {
        return;
    }


    if (
        !vehicle.path ||
        vehicle.path.length < 2
    ) {
        return;
    }


    // --------------------------------------
    // Check road before moving
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
    // Update map
    // --------------------------------------

    drawVehicle(
        svg,
        vehicle
    );


    // --------------------------------------
    // Check arrival
    // --------------------------------------

    if (
        currentIncident &&
        vehicle.node ===
        currentIncident.node
    ) {

        vehicle.path = [
            vehicle.node
        ];


        // Vehicle remains dispatched until
        // reset/released by the simulation.

        console.log(
            `${vehicle.id} arrived at ${vehicle.node}`
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
// EXPOSE SIMULATION HELPERS
// ==========================================
//
// These are useful while developing.
// They can later be connected to UI buttons.

window.RESQ = {

    moveVehicle,

    moveAllVehicles,

    checkActiveVehicles,

    reset: () => {

        resetAllVehicles();

        currentIncident = null;

        currentAssignments = [];


        for (const vehicle of VEHICLES) {

            removeVehicleMarker(
                svg,
                vehicle.id
            );
        }


        drawAllVehicles();

        renderResults(
            resultsContainer,
            null,
            {
                priority: "MEDIUM",
                needs: {
                    ambulance: 0,
                    police: 0,
                    fire_truck: 0
                },
                trace: []
            },
            {
                assignments: [],
                shortages: []
            }
        );


        updateRoads(svg);
    },

    releaseVehicle,

    getVehicles: () => VEHICLES,

    getEdges: () => EDGES
};


// ==========================================
// INITIAL MESSAGE
// ==========================================

console.log(
    "🚨 RESQ-AI initialized."
);

console.log(
    "Submit an incident to begin."
);