#!/usr/bin/env python3
"""
export_labels.py - area names and landmarks for the ResQ-AI map  ->  src/data/labels.json

Run once from the project root, after city.json exists (it reads the map box from city.json):
    python scripts/export_labels.py
Picks suburbs/localities (Kaloor, Palarivattom ...), Kochi Metro stations (JLN Stadium, Kadavanthra,
Vyttila ...) and the stadium/mall landmarks that fall inside the map. Data (c) OpenStreetMap, ODbL.
"""
import argparse, json, math, re

M_LAT = 110540.0


def project(lat, lon, bbox):
    """lat/lon -> map metres, the same formula city.json uses (origin south-west, y flipped)."""
    west, south, east, north = bbox
    m_lon = 111320.0 * math.cos(math.radians((south + north) / 2))
    return round((lon - west) * m_lon, 1), round((north - lat) * M_LAT, 1)


def pick_labels(cands, width, height, min_gap=300, limit=26, margin=120):
    """Best labels first (lowest rank); drop repeats, off-map points and labels crowding a better one."""
    out, seen = [], set()
    for c in sorted(cands, key=lambda c: c["rank"]):
        key = c["name"].lower()
        if key in seen or not (margin < c["x"] < width - margin and margin < c["y"] < height - margin):
            continue
        if any(math.hypot(c["x"] - o["x"], c["y"] - o["y"]) < min_gap for o in out):
            continue
        seen.add(key)
        out.append({k: c[k] for k in ("name", "kind", "x", "y")})
        if len(out) == limit:
            break
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--city", default="src/data/city.json")
    ap.add_argument("--out", default="src/data/labels.json")
    ap.add_argument("--overpass", default="https://overpass-api.de/api",
                    help="OSM server; if it times out try https://overpass.private.coffee/api")
    a = ap.parse_args()
    city = json.load(open(a.city))
    bbox, W, H = city["meta"]["bbox"], city["meta"]["width_m"], city["meta"]["height_m"]

    import osmnx as ox
    ox.settings.overpass_url = a.overpass      # which public OSM server to ask
    ox.settings.requests_timeout = 180         # allow slow servers up to 3 minutes
    gdf = ox.features.features_from_bbox(tuple(bbox), tags={
        "place": ["suburb", "quarter", "neighbourhood", "locality"],
        "leisure": ["stadium"], "railway": ["station"], "shop": ["mall"]})
    rank_of = {"suburb": 0, "quarter": 2, "neighbourhood": 2, "locality": 3}
    cands = []
    for _, row in gdf.iterrows():
        name = row.get("name:en") if isinstance(row.get("name:en"), str) else row.get("name")
        if not isinstance(name, str) or not name.isascii():      # skip names with no English form
            continue
        name = re.sub(r"\s+(Metro|Railway|Junction)?\s*Station$", "", name, flags=re.I).strip()
        pt = row.geometry.representative_point()
        x, y = project(pt.y, pt.x, bbox)
        if isinstance(row.get("place"), str):
            kind, rank = "place", rank_of.get(row["place"], 3)
        else:
            kind, rank = "landmark", (1 if row.get("leisure") == "stadium" or row.get("railway") == "station" else 3)
        cands.append({"name": name, "kind": kind, "rank": rank, "x": x, "y": y})

    labels = pick_labels(cands, W, H)
    json.dump(labels, open(a.out, "w"), indent=1)
    print(f"Wrote {a.out}: {len(labels)} labels")
    for l in labels:
        print(f"  {l['kind']:8s} {l['name']}")


if __name__ == "__main__":
    main()