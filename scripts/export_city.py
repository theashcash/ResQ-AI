#!/usr/bin/env python3

"""
RESQ-AI OSM City Exporter

Downloads a real OpenStreetMap road network and converts it into
the city.json format used by RESQ-AI.

Run from the ResQ-AI project root:

    python3 scripts/export_city.py \
        --out src/data/city.json \
        --preview preview.svg

Requires:

    pip install "osmnx>=2.0"

The generated data contains:
    - real road intersections
    - real road geometry
    - road lengths
    - road classes
    - estimated speed
    - selected hospitals
    - selected fire stations
    - selected police stations

OpenStreetMap data © OpenStreetMap contributors, ODbL.
"""

import argparse
import json
import math
import re
import sys
from datetime import date

import networkx as nx
from shapely.geometry import LineString


# ============================================================
# ROAD SPEED ASSUMPTIONS
# ============================================================

HWY_SPEEDS = {
    "motorway": 60,
    "trunk": 45,
    "primary": 40,
    "secondary": 35,
    "tertiary": 30,
    "unclassified": 25,
    "residential": 20,
    "living_street": 15,
}

FALLBACK_SPEED = 25

RANK = [
    "motorway",
    "trunk",
    "primary",
    "secondary",
    "tertiary",
    "unclassified",
    "residential",
    "living_street",
]

M_PER_DEG_LAT = 110540.0


# ============================================================
# SELECTED RESQ-AI FACILITIES
# ============================================================

# These are the five hospitals selected for the simulation.

SELECTED_HOSPITALS = [
    {
        "name": "Medical Trust Hospital",
        "lat": 9.9648215,
        "lon": 76.2873632,
    },
    {
        "name": "General Hospital Ernakulam",
        "lat": 9.9719600,
        "lon": 76.2810520,
    },
    {
        "name": "Welcare Hospital",
        "lat": 9.9680068,
        "lon": 76.3153834,
    },
    {
        "name": "Lisie Hospital",
        "lat": 9.9878860,
        "lon": 76.2882310,
    },
    {
        "name": "Renai Medicity",
        "lat": 10.0079410,
        "lon": 76.3035510,
    },
]


# Two fire stations selected for RESQ-AI.

SELECTED_FIRE_STATIONS = [
    {
        "name": "Fire and Rescue Station Gandhinagar",
        "lat": 9.9743096,
        "lon": 76.2956158,
    },
    {
        "name": "Fire and Rescue Station Club Road",
        "lat": 9.9691573,
        "lon": 76.2848946,
    },
]


# Three police stations selected for RESQ-AI.

SELECTED_POLICE_STATIONS = [
    {
        "name": "Kadavanthra Police Station",
        "lat": 9.9701843,
        "lon": 76.2969217,
    },
    {
        "name": "Janamythri Police Station, Palarivattom",
        "lat": 10.0025055,
        "lon": 76.3057349,
    },
    {
        "name": "Ernakulam Town North Police Station",
        "lat": 9.988802,
        "lon": 76.282690,
    },
]


# ============================================================
# ROAD HELPERS
# ============================================================

def road_class(highway):
    """
    OSM 'highway' can be a string or a list.

    Example:
        "primary"
        ["residential", "tertiary"]

    We select the most important class.
    """

    vals = highway if isinstance(highway, list) else [highway]

    vals = [
        str(v).replace("_link", "")
        for v in vals
        if v is not None
    ]

    known = [v for v in vals if v in RANK]

    if not known:
        return "residential"

    return min(known, key=RANK.index)


def parse_speed(maxspeed, cls):
    """
    Convert an OSM maxspeed value into km/h.

    Examples:
        "50"       -> 50
        "30 mph"   -> 48
        ["40","50"] -> 40

    If no usable speed exists, use the road-class default.
    """

    vals = maxspeed if isinstance(maxspeed, list) else [maxspeed]

    nums = []

    for value in vals:

        if value is None:
            continue

        match = re.match(
            r"^\s*(\d+(?:\.\d+)?)\s*(mph)?\s*$",
            str(value),
            re.IGNORECASE,
        )

        if match:

            number = float(match.group(1))

            if match.group(2):
                number *= 1.609

            nums.append(number)

    if nums:
        return round(min(nums))

    return HWY_SPEEDS.get(cls, FALLBACK_SPEED)


# ============================================================
# BUILD CITY JSON
# ============================================================

def build_city(
    G,
    facilities,
    bbox,
    name="Kochi RESQ-AI",
    simplify_m=2.0,
):
    """
    Convert an OSMnx NetworkX MultiDiGraph into RESQ-AI city data.
    """

    # --------------------------------------------------------
    # Keep largest connected component
    # --------------------------------------------------------

    components = list(nx.weakly_connected_components(G))

    if not components:
        raise RuntimeError("The downloaded road network is empty.")

    largest = max(components, key=len)

    G = G.subgraph(largest).copy()

    # --------------------------------------------------------
    # Coordinate conversion
    # --------------------------------------------------------

    west, south, east, north = bbox

    lat0 = (south + north) / 2

    m_per_deg_lon = (
        111320.0 * math.cos(math.radians(lat0))
    )

    def to_xy(lon, lat):

        x = (lon - west) * m_per_deg_lon

        y = (north - lat) * M_PER_DEG_LAT

        return x, y

    # --------------------------------------------------------
    # Give every OSM node a compact ID
    # --------------------------------------------------------

    ids = {
        node: f"n{i}"
        for i, node in enumerate(G.nodes)
    }

    nodes = {}

    for node, data in G.nodes(data=True):

        x, y = to_xy(
            data["x"],
            data["y"],
        )

        nodes[ids[node]] = {
            "x": round(x, 1),
            "y": round(y, 1),
        }

    # --------------------------------------------------------
    # Convert directed OSM edges into one road per pair
    # --------------------------------------------------------

    best = {}

    for u, v, data in G.edges(data=True):

        # Ignore self loops.
        if u == v:
            continue

        # Make the edge direction deterministic.
        a, b = (
            (u, v)
            if str(u) < str(v)
            else (v, u)
        )

        # ----------------------------------------------------
        # Road geometry
        # ----------------------------------------------------

        if "geometry" in data:

            points = list(
                data["geometry"].coords
            )

        else:

            points = [
                (
                    G.nodes[u]["x"],
                    G.nodes[u]["y"],
                ),
                (
                    G.nodes[v]["x"],
                    G.nodes[v]["y"],
                ),
            ]

        # Reverse geometry if we reversed the edge.
        if (a, b) != (u, v):

            points.reverse()

        length = float(
            data.get("length", 0)
        )

        key = (a, b)

        # Keep the shortest representation.
        if (
            key not in best
            or length < best[key][0]
        ):

            best[key] = (
                length,
                points,
                data,
            )

    # --------------------------------------------------------
    # Build edge list
    # --------------------------------------------------------

    edges = []

    for (a, b), (
        length,
        points,
        data,
    ) in best.items():

        xy_points = [
            to_xy(lon, lat)
            for lon, lat in points
        ]

        line = LineString(
            xy_points
        ).simplify(simplify_m)

        cls = road_class(
            data.get("highway")
        )

        name_value = data.get("name")

        if isinstance(name_value, list):

            road_name = name_value[0]

        else:

            road_name = name_value or ""

        edges.append(
            {
                "id": f"e{len(edges)}",

                "from": ids[a],

                "to": ids[b],

                "length": round(
                    length,
                    1,
                ),

                "road": cls,

                "speed": parse_speed(
                    data.get("maxspeed"),
                    cls,
                ),

                "name": road_name,

                "oneway": bool(
                    data.get("oneway")
                ),

                "traffic": 0,

                "blocked": False,

                "geometry": [
                    [
                        round(x, 1),
                        round(y, 1),
                    ]
                    for x, y in line.coords
                ],
            }
        )

    # --------------------------------------------------------
    # Attach facilities to nearest road junction
    # --------------------------------------------------------

    node_xy = []

    for node, data in G.nodes(
        data=True
    ):

        x, y = to_xy(
            data["x"],
            data["y"],
        )

        node_xy.append(
            (
                ids[node],
                x,
                y,
            )
        )

    output_facilities = []

    warnings = []

    for i, facility in enumerate(
        facilities
    ):

        fx, fy = to_xy(
            facility["lon"],
            facility["lat"],
        )

        nearest = min(
            node_xy,
            key=lambda item:
                (item[1] - fx) ** 2
                +
                (item[2] - fy) ** 2,
        )

        node_id = nearest[0]

        node_x = nearest[1]
        node_y = nearest[2]

        distance = math.hypot(
            node_x - fx,
            node_y - fy,
        )

        if distance > 150:

            warnings.append(
                f"{facility['type']} "
                f"'{facility['name']}' "
                f"is {distance:.0f} m "
                f"from the nearest junction"
            )

        output_facilities.append(
            {
                "id": f"f{i}",

                "type": facility["type"],

                "name": facility["name"],

                "node": node_id,

                "lat": round(
                    facility["lat"],
                    6,
                ),

                "lon": round(
                    facility["lon"],
                    6,
                ),
            }
        )

    # --------------------------------------------------------
    # Final city object
    # --------------------------------------------------------

    return {
        "meta": {
            "name": name,

            "bbox": list(bbox),

            "generated": str(
                date.today()
            ),

            "width_m": round(
                (east - west)
                * m_per_deg_lon
            ),

            "height_m": round(
                (north - south)
                * M_PER_DEG_LAT
            ),

            "source":
                "OpenStreetMap contributors (ODbL)",
        },

        "nodes": nodes,

        "edges": edges,

        "facilities":
            output_facilities,

        "_warnings":
            warnings,
    }


# ============================================================
# SVG PREVIEW
# ============================================================

def write_preview(city, path):

    width = city["meta"]["width_m"]

    height = city["meta"]["height_m"]

    facility_colors = {
        "hospital": "#e74c3c",
        "fire_station": "#f39c12",
        "police": "#3498db",
    }

    svg = [
        (
            '<svg '
            'xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {width} {height}" '
            'style="background:#0d1b2a">'
        )
    ]

    # --------------------------------------------------------
    # Roads
    # --------------------------------------------------------

    for edge in city["edges"]:

        points = " ".join(
            f"{x},{y}"
            for x, y
            in edge["geometry"]
        )

        if edge["road"] in RANK[:4]:

            stroke_width = 4

        else:

            stroke_width = 2

        svg.append(
            (
                f'<polyline '
                f'points="{points}" '
                f'fill="none" '
                f'stroke="#4a627d" '
                f'stroke-width="{stroke_width}"/>'
            )
        )

    # --------------------------------------------------------
    # Facilities
    # --------------------------------------------------------

    for facility in city[
        "facilities"
    ]:

        node = city[
            "nodes"
        ][
            facility["node"]
        ]

        color = facility_colors.get(
            facility["type"],
            "#ffffff",
        )

        svg.append(
            (
                f'<circle '
                f'cx="{node["x"]}" '
                f'cy="{node["y"]}" '
                f'r="35" '
                f'fill="{color}">'
                f'<title>'
                f'{facility["name"]}'
                f'</title>'
                f'</circle>'
            )
        )

    svg.append("</svg>")

    with open(
        path,
        "w",
        encoding="utf-8",
    ) as file:

        file.write(
            "".join(svg)
        )


# ============================================================
# MAIN
# ============================================================

def main():

    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=
        argparse.RawDescriptionHelpFormatter,
    )

    # --------------------------------------------------------
    # Bounding box
    #
    # These defaults cover the selected facilities.
    # --------------------------------------------------------

    parser.add_argument(
        "--center",
        nargs=2,
        type=float,
        default=[
            9.9864,
            76.2980,
        ],
        metavar=("LAT", "LON"),
        help="Center latitude and longitude",
    )

    parser.add_argument(
        "--width-km",
        type=float,
        default=4.5,
        help="Road network width in km",
    )

    parser.add_argument(
        "--height-km",
        type=float,
        default=5.5,
        help="Road network height in km",
    )

    parser.add_argument(
        "--out",
        default="src/data/city.json",
        help="Output JSON path",
    )

    parser.add_argument(
        "--preview",
        default="",
        help="Optional SVG preview path",
    )

    args = parser.parse_args()

    # --------------------------------------------------------
    # Import OSMnx
    # --------------------------------------------------------

    import osmnx as ox

    lat, lon = args.center

    # --------------------------------------------------------
    # Calculate bounding box
    # --------------------------------------------------------

    dlat = (
        args.height_km
        * 1000
        / M_PER_DEG_LAT
        / 2
    )

    dlon = (
        args.width_km
        * 1000
        /
        (
            111320.0
            * math.cos(
                math.radians(lat)
            )
        )
        / 2
    )

    bbox = (
        lon - dlon,
        lat - dlat,
        lon + dlon,
        lat + dlat,
    )

    print()
    print(
        "======================================"
    )
    print(
        "        RESQ-AI OSM EXPORTER"
    )
    print(
        "======================================"
    )

    print(
        f"Center: {lat:.6f}, {lon:.6f}"
    )

    print(
        f"Area: "
        f"{args.width_km} km × "
        f"{args.height_km} km"
    )

    print()

    # --------------------------------------------------------
    # Download roads
    # --------------------------------------------------------

    print(
        "Downloading drivable road network ..."
    )

    G = ox.graph.graph_from_bbox(
        bbox,
        network_type="drive",
        simplify=True,
    )

    print(
        f"Downloaded "
        f"{len(G.nodes):,} road nodes "
        f"and "
        f"{len(G.edges):,} directed edges."
    )

    # --------------------------------------------------------
    # Download facilities
    #
    # We only need police/fire from OSM.
    # Hospitals are explicitly defined above.
    # --------------------------------------------------------

    print(
        "Downloading police and fire stations ..."
    )

    gdf = ox.features.features_from_bbox(
        bbox,
        tags={
            "amenity": [
                "police",
                "fire_station",
            ]
        },
    )

    osm_facilities = []

    for _, row in gdf.iterrows():

        point = (
            row.geometry
            .representative_point()
        )

        kind = row["amenity"]

        name = row.get("name")

        if not isinstance(
            name,
            str,
        ):

            name = (
                f"Unnamed {kind}"
            )

        osm_facilities.append(
            {
                "type": kind,
                "name": name,
                "lat": point.y,
                "lon": point.x,
            }
        )

    # --------------------------------------------------------
    # Start with our selected hospitals.
    # --------------------------------------------------------

    facilities = []

    for hospital in (
        SELECTED_HOSPITALS
    ):

        facilities.append(
            {
                "type": "hospital",
                "name": hospital[
                    "name"
                ],
                "lat": hospital[
                    "lat"
                ],
                "lon": hospital[
                    "lon"
                ],
            }
        )

    # --------------------------------------------------------
    # Select fire stations.
    #
    # We use the explicit coordinates so the final dataset
    # doesn't depend on how OSM happened to name them.
    # --------------------------------------------------------

    for station in (
        SELECTED_FIRE_STATIONS
    ):

        facilities.append(
            {
                "type":
                    "fire_station",

                "name":
                    station["name"],

                "lat":
                    station["lat"],

                "lon":
                    station["lon"],
            }
        )

    # --------------------------------------------------------
    # Select police stations.
    # --------------------------------------------------------

    for station in (
        SELECTED_POLICE_STATIONS
    ):

        facilities.append(
            {
                "type":
                    "police",

                "name":
                    station["name"],

                "lat":
                    station["lat"],

                "lon":
                    station["lon"],
            }
        )

    # --------------------------------------------------------
    # Build city
    # --------------------------------------------------------

    print()
    print(
        "Converting OSM network "
        "to RESQ-AI format ..."
    )

    city = build_city(
        G,
        facilities,
        bbox,
        name="Kochi RESQ-AI",
    )

    warnings = city.pop(
        "_warnings"
    )

    # --------------------------------------------------------
    # Make sure output directory exists
    # --------------------------------------------------------

    import os

    output_directory = os.path.dirname(
        args.out
    )

    if output_directory:

        os.makedirs(
            output_directory,
            exist_ok=True,
        )

    # --------------------------------------------------------
    # Write JSON
    # --------------------------------------------------------

    with open(
        args.out,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            city,
            file,
            separators=(",", ":"),
        )

    # --------------------------------------------------------
    # Preview
    # --------------------------------------------------------

    if args.preview:

        write_preview(
            city,
            args.preview,
        )

    # --------------------------------------------------------
    # Statistics
    # --------------------------------------------------------

    total_road_km = (
        sum(
            edge["length"]
            for edge in city["edges"]
        )
        / 1000
    )

    print()
    print(
        "======================================"
    )

    print(
        "EXPORT COMPLETE"
    )

    print(
        "======================================"
    )

    print(
        f"Nodes: "
        f"{len(city['nodes']):,}"
    )

    print(
        f"Road segments: "
        f"{len(city['edges']):,}"
    )

    print(
        f"Road length: "
        f"{total_road_km:.1f} km"
    )

    print()

    for facility_type in (
        "hospital",
        "fire_station",
        "police",
    ):

        found = [
            facility["name"]
            for facility
            in city["facilities"]
            if facility["type"]
            == facility_type
        ]

        print(
            f"{facility_type}: "
            f"{len(found)}"
        )

        for name in found:

            print(
                f"  - {name}"
            )

    # --------------------------------------------------------
    # Warnings
    # --------------------------------------------------------

    if warnings:

        print()
        print(
            "WARNINGS:"
        )

        for warning in warnings:

            print(
                f"  !! {warning}"
            )

    print()
    print(
        f"Wrote: {args.out}"
    )

    if args.preview:

        print(
            f"Preview: {args.preview}"
        )

    print()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    sys.exit(
        main()
    )