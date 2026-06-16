# Destination-first shortcuts — feature spec

A "Go" feature for *Where Da Bus Stay?* that lets a rider pick **where they're going** and get a one-tap "take Route X from Stop Y, next bus in N min" answer — without building a full trip-planning graph router.

Status: proposal. Targets the existing React + Vite frontend and Express/GTFS backend.

---

## 1. Why this works without a real trip planner

A general trip planner solves arbitrary origin → arbitrary destination routing over a time-expanded network (the hard problem you deliberately deferred). This feature avoids that by exploiting two facts:

1. **Destinations are curated**, not arbitrary — a fixed list of ~15–40 beloved Oahu places.
2. **Oahu's network is hub-and-spoke**, so a large share of real trips are one-seat rides.

If you precompute *which routes serve each destination*, answering "how do I get there from here" collapses to a set intersection you can already compute from `processed.json`:

> stops near the user (`/api/nearby-stops-by-coords`) ∩ stops on a route that also serves the destination = a direct ride.

No routing graph. The only non-trivial check is travel direction, and the ordered stop sequences already in `processed.json` give you that for free (see §4).

---

## 2. Data model — `destinations.json`

A hand-authored file, enriched offline with verified stop and route data. Each entry:

```json
{
  "id": "ala-moana",
  "name": "Ala Moana Center",
  "aliases": ["ala mo", "the mall", "shopping center"],
  "category": "shopping",
  "lat": 21.29139,
  "lon": -157.84361,
  "note": "Ala Moana Transit Center sits behind the mall — most routes stop here.",
  "destinationStops": [
    { "stop_id": "426", "name": "KONA ST + OPP KEEAUMOKU ST (NS)", "dist_m": 107 },
    { "stop_id": "761", "name": "ALA MOANA BL + ALA MOANA CENTER", "dist_m": 192 }
  ],
  "routes": ["3","5","6","7","8","13","42","52","53","60","65","67","88A","102","E","W LINE"]
}
```

Two fields are pure curation and carry the local-knowledge advantage:

- **`aliases`** — how locals actually search ("ala mo", "town", "the beach"), not the official name.
- **`note`** — the thing no GTFS feed encodes ("get off at the mauka entrance"). This is the through-line with the broader "be the local app Transit can't be" strategy.

`destinationStops` and `routes` are generated, not hand-typed (see §3), so they stay correct against the live feed.

A starter `destinations.json` with 15 real Oahu destinations ships alongside this spec.

---

## 3. Precompute step (extend `preprocess.js`)

`preprocess.js` already builds `routeDirections[]`, each with an ordered, de-duped `stops` list per direction. Add a pass that, for each destination:

1. Finds every stop within `RADIUS_M` (250 m works well) of the destination's `lat`/`lon` — haversine against `stops.txt`.
2. Unions the `route_short_name`s of every `routeDirection` whose stop sequence includes one of those stops.
3. Writes `destinationStops` (nearest 6) and `routes` back into the entry.

This is the same logic as the standalone `gen_destinations.js` provided with this spec; folding it into `preprocess.js` means destinations refresh automatically every time you regenerate `processed.json` after a GTFS update.

### Curation caveat learned from real data

Anchoring a destination at its **landmark centroid** fails — the geographic center of the airport, Diamond Head crater, or a mall is not where the buses stop. When the starter file was first generated, Waikiki, the airport, and Diamond Head returned **zero routes** for exactly this reason. The fix is to anchor each `lat`/`lon` on the **boarding area** (the Kūhiō Ave corridor, the Lelepaua airport station, the Monsarrat Ave stops), which a human picks once per destination. Build a validation guard into `preprocess.js` that **fails loudly if any destination resolves to zero stops or zero routes**, so a future GTFS refresh that moves or renames a stop can't silently empty a destination.

---

## 4. Runtime — one new endpoint

`GET /api/trip-to/:destId?lat={userLat}&lon={userLon}`

1. Load the destination from `destinations.json`.
2. Compute stops near the user (reuse the existing distance helper from `/api/nearby-stops-by-coords`).
3. **Intersect** those nearby stops with the routes that serve the destination, producing candidate "walk to stop X, board route Y" options.
4. **Direction check** — keep an option only if, in some `routeDirection` of route Y, the boarding stop appears at an *earlier* sequence index than one of the destination stops. This is what filters out the wrong direction and loop-route artifacts, and it needs nothing beyond the ordered `stops` arrays already in `processed.json`.
5. Fetch live arrivals for the top boarding stops (reuse the OTS proxy at `/api/arrivals`), keep the relevant route + direction.
6. Rank by `walkTime + nextArrival`, return the best 2–3 options.

No new OTS calls beyond the arrivals you'd fetch anyway. The intersection and direction check run against precomputed data.

---

## 5. Frontend

New pieces:

- `useDestinations` hook — loads `destinations.json`, exposes search/filter by name + alias, and a `planTrip(destId)` that calls `/api/trip-to`.
- `DestinationsTab.jsx` — the Go grid: a time-aware greeting, quick chips (Work / Home / Beach), and a category-iconed destination grid with a live hint per card.
- `DestinationDetail.jsx` — one confident "Best ride" card (walk leg, route badge, live countdown, ride time, Track + Map buttons), the curated `note` as a callout, and a single quieter alternative.

Reuse, don't rebuild: `RouteMap` for the detail map (origin stop + destination highlighted), `useBusTracking` + `BusTrackingMap` behind the Track button, and the existing arrival-card styling.

Three touches that make it read as *yours*, not a Transit clone:

- **Time-of-day awareness** — mornings surface Work/School/Town, evenings surface Home and the beach, weekends surface hikes and attractions.
- **Tourist's first question** — when GPS puts the user near HNL, lead with airport → Waikiki.
- **Local `note` on every detail screen** — the curated knowledge GTFS can't carry.

### Navigation placement (decision needed)

The bottom nav already has five tabs (Home / Routes / Recent / Favorites / Settings); adding Go makes six, which is tight on a phone. Options:

1. **Go as a band on Home** — no new tab; least disruptive. (Recommended to start.)
2. **Six tabs** — simplest mentally, most crowded.
3. **Fold Recent into Home**, free the slot for Go.

---

## 6. Phasing

**Phase 1 — direct rides only.** Curated `destinations.json`, the `preprocess.js` pass, the `/api/trip-to` endpoint, and the two views. On a hub-and-spoke island this already covers a large fraction of real trips, and it's fully shippable on the current stack. Ship this and see whether the feature earns its keep before going further.

**Phase 2 — one-transfer trips** (only if Phase 1 lands). Precompute route pairs that share a curated transfer hub (Ala Moana Transit Center, Kalihi Transit Center, Kapolei, Pearlridge). Because the hub set is fixed, this stays bounded set intersection, not open graph search. Don't build it first.

---

## 7. Risks & edge cases

- **Direction ambiguity** on loop/branching routes — the sequence-index check in §4 handles most; spot-check the weird ones.
- **GTFS drift** — stop IDs change when TheBus republishes every 4–8 weeks. The §3 validation guard (fail loudly on empty destinations) catches this at preprocess time.
- **No service / last bus of day** — reuse the existing "No upcoming buses" empty-state pattern, phrased per destination ("No buses to Ala Moana right now").
- **Anchor curation** — each destination's `lat`/`lon` is a one-time human judgment about the boarding area, not the landmark center (see §3).

---

## 8. Why this beats Transit at this one thing

Transit's planner is powerful but generic — it returns a wall of itineraries for any origin/destination pair, and its copy is corporate-neutral by necessity. This feature answers the fifteen questions Oahu riders actually ask, in one tap, with local knowledge baked in, instantly, offline-capable, no account. That's a different product, not a thinner clone.

---

## Appendix — starter destinations (verified against the current GTFS feed)

| Destination | Category | Stops found | Serving routes |
|---|---|---|---|
| Ala Moana Center | shopping | 6 | 3, 5, 6, 7, 8, 13, 42, 52, 53, 60, 65, 67, 88A, 102, E, W LINE |
| Waikiki | beach | 5 | 2, 2L, 8, 13, 42, E, W LINE, W1, W2, W3 |
| UH Mānoa | school | 6 | 4, 6, 13, A LINE |
| Honolulu Airport (HNL) | transit | 2 | W LINE |
| Downtown Honolulu | transit | 6 | 1, 2, 3, 4, 6, 13, 42, 52, 53, 54, 60–98 family, A LINE, E, PH6 |
| Diamond Head | hike | 5 | 2, 2L, 200 |
| Kāhala Mall | shopping | 3 | 1, 1L, 2L, 14, 23, 234 |
| Pearlridge Center | shopping | 6 | 32, 42, 51, 53, 541, 542, 544, 545 |
| Windward Mall | shopping | 6 | 60, 61, 65, 69, 85, 651, PH4 |
| Kapiolani Park | beach | 3 | 8, 42, E, W1, W2, W3 |
| Ala Moana Beach Park | beach | 2 | 6, 42, 60, 65, 67, 88A, E, W LINE |
| Chinatown | transit | 6 | 1, 2, 3, 7, 13, 42, 51–98 family, 151, A LINE |
| Kalihi Transit Center | transit | 5 | 1, 2, 32, 42, 51, 52, 61, 301, 302, 306, 307, C, W3 |
| Kapolei | transit | 6 | 40, 41, 46, 95, 99, 411, 413, 414, 415, 416, C |
| Hawaii Kai | shopping | 3 | 1, 1L, 80, PH6 |

Generated at 250 m radius. The airport resolving to a single route (W LINE / express) is a real finding worth a human look — it may warrant a wider radius or a second anchor near the terminal stops.
