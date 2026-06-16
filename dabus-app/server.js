import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import fetch from "node-fetch"
import dotenv from "dotenv"
import fs from "fs"
import { parse } from "csv-parse/sync"
import http from "http"
import https from "https"
import { parseAlerts } from "./alerts.js"

dotenv.config()

const app = express()

// Security headers
app.use(helmet())

// Rate limit: 60 requests per minute per IP across all /api routes
app.use("/api", rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, slow down." },
}))

// CORS: allow only origins listed in ALLOWED_ORIGINS (comma-separated).
// Defaults to common local dev origins if the env var is unset.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://localhost:5173,https://192.168.4.27:5173")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean)

app.use(cors({
    origin: (origin, cb) => {
        // Allow non-browser tools (curl, server-to-server) and explicitly listed origins
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
        return cb(new Error("Not allowed by CORS"))
    },
}))

// Load stops from GTFS stops.txt (small — needed for search/nearby/stop-info endpoints)
const stopsData = fs.readFileSync("./data/stops.txt", "utf8")
const stops = parse(stopsData, { columns: true, skip_empty_lines: true })

// Load pre-processed route/shape data (replaces the heavy shapes.txt, trips.txt,
// stop_times.txt, and routes.txt that would blow the 512MB Railway memory limit).
// Re-generate with: node preprocess.js
const { routeDirections, shapes, shapeStops, stopBearings } = JSON.parse(
    fs.readFileSync("./data/processed.json", "utf8")
)

// Index stops by stop_id
const stopsById = stops.reduce((acc, stop) => {
    acc[stop.stop_id] = stop
    return acc
}, {})

// Strip GTFS internal "_merge" suffix so the frontend always sees the user-visible
// stop code (e.g. "4511_merge" -> "4511"). The bus signage and OTS API use the bare
// code; only GTFS internals carry the suffix.
const displayStopId = (id) => (typeof id === "string" ? id.replace(/_merge$/, "") : id)

// Look up a stop by either its displayed ID or its raw GTFS stop_id, so frontend
// callers can use the user-visible code without knowing about the "_merge" quirk.
const getStopByDisplayId = (id) => {
    if (Object.prototype.hasOwnProperty.call(stopsById, id)) return stopsById[id]
    const mergeKey = `${id}_merge`
    if (Object.prototype.hasOwnProperty.call(stopsById, mergeKey)) return stopsById[mergeKey]
    return null
}

// Set of route_short_name values present in our GTFS bundle. Used by the alerts
// parser to decide which mentioned routes the frontend can deep-link to.
const knownRouteShortNames = new Set(
    routeDirections.map(r => r.route_short_name).filter(Boolean)
)

// Go: destination-first shortcuts.
// Curated Oahu destinations, enriched offline with verified stops + serving
// routes (see gen_destinations.js / docs/destination-first-spec.md).
const destinations = JSON.parse(fs.readFileSync("./destinations.json", "utf8"))
const destinationsById = destinations.reduce((acc, d) => {
    acc[d.id] = d
    return acc
}, {})

// Per-route ordered-stop indices, so we can verify a boarding stop comes BEFORE
// a destination stop within a single direction (the travel-direction check).
// route_short_name -> [ { id, seq: Map(stop_id -> index) } ]
const routeSeqIndex = {}
for (const rd of routeDirections) {
    const name = rd.route_short_name
    if (!name) continue
    const seq = new Map()
    rd.stops.forEach((s, i) => { if (!seq.has(s.stop_id)) seq.set(s.stop_id, i) })
    if (!routeSeqIndex[name]) routeSeqIndex[name] = []
    routeSeqIndex[name].push({ id: rd.id, seq })
}

// Does `routeName` carry a rider from boardingStopId toward any destStopId in a
// single direction? True only if some direction lists the boarding stop earlier
// in its sequence than a destination stop -- this filters out the wrong
// direction and loop-route artifacts.
function routeGoesToward(routeName, boardingStopId, destStopIds) {
    const dirs = routeSeqIndex[routeName]
    if (!dirs) return false
    for (const d of dirs) {
        const bi = d.seq.get(boardingStopId)
        if (bi === undefined) continue
        for (const ds of destStopIds) {
            const di = d.seq.get(ds)
            if (di !== undefined && bi < di) return true
        }
    }
    return false
}

// Calculate distance between two lat/lon points in miles
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

const abbreviations = {
    "street": "st", "road": "rd", "avenue": "ave", "highway": "hwy",
    "drive": "dr", "place": "pl", "boulevard": "bl", "parkway": "pkwy",
    "loop": "lp", "lane": "ln",
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// Allow only safe id chars (digits, letters, underscore, hyphen, dot).
// Rejects URL escapes, special regex chars, and __proto__/constructor lookups.
const isSafeId = (s) => typeof s === "string" && /^[\w.-]+$/.test(s) && s !== "__proto__" && s !== "constructor" && s !== "prototype"

const normalizeQuery = (query) => {
    let q = query.toLowerCase()
    Object.entries(abbreviations).forEach(([full, abbr]) => {
        q = q.replace(new RegExp(`\\b${full}\\b`, "g"), abbr)
    })
    return q
}

// Arrivals endpoint
app.get("/api/arrivals", async (req, res) => {
    const stop = req.query.stop
    if (!/^\d+$/.test(stop || "")) {
        return res.status(400).json({ error: "Invalid stop number" })
    }
    const apiKey = process.env.THEBUS_API_KEY
    const url = new URL("http://api.thebus.org/arrivalsJSON/")
    url.searchParams.set("key", apiKey)
    url.searchParams.set("stop", stop)
    try {
        const response = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
        const data = await response.json()
        res.json(data)
    } catch (_err) {
        res.status(500).json({ error: "Failed to fetch arrivals" })
    }
})

// Shape endpoint
app.get("/api/shape/:shapeId", (req, res) => {
    const shapeId = req.params.shapeId
    if (!isSafeId(shapeId)) return res.status(400).json({ error: "Invalid shape id" })
    const shape = Object.prototype.hasOwnProperty.call(shapes, shapeId) ? shapes[shapeId] : null
    if (!shape) return res.status(404).json({ error: "Shape not found" })
    res.json({ shape })
})

// Trip stops endpoint — used for bus tracking route display.
// Live trip IDs from the OTS API won't be in GTFS, so we always fall back
// to the pre-processed shapeStops index keyed by shape_id.
app.get("/api/trip/:tripId/stops", (req, res) => {
    const tripId = req.params.tripId
    if (!isSafeId(tripId)) return res.status(400).json({ error: "Invalid trip id" })

    const shapeId = req.query.shape
    if (shapeId && isSafeId(shapeId) && Object.prototype.hasOwnProperty.call(shapeStops, shapeId)) {
        return res.json({ stops: shapeStops[shapeId] })
    }

    res.status(404).json({ error: "Trip not found" })
})

// All routes endpoint — one entry per direction
app.get("/api/routes", (req, res) => {
    res.json({
        routes: routeDirections.map(({ id, route_short_name, route_long_name, headsign }) => ({
            route_id: id,
            route_short_name: route_short_name || "–",
            route_long_name: headsign
                ? headsign.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
                : route_long_name,
            route_description: route_long_name,
        }))
    })
})

// Stops for a specific route direction
app.get("/api/route/:routeId/stops", (req, res) => {
    const routeId = req.params.routeId
    if (!isSafeId(routeId)) return res.status(400).json({ error: "Invalid route id" })
    const entry = routeDirections.find(r => r.id === routeId)
    if (!entry) return res.status(404).json({ error: "Route not found" })
    const shape = entry.shape_id && Object.prototype.hasOwnProperty.call(shapes, entry.shape_id)
        ? shapes[entry.shape_id]
        : []
    res.json({ stops: entry.stops, shape })
})

// Stop name search endpoint
app.get("/api/search-stops", (req, res) => {
    const query = normalizeQuery(req.query.q ?? "")
    if (!query) return res.status(400).json({ error: "No search query provided" })

    const terms = query.split(/\s+/).filter(Boolean)
    const results = stops
        .filter(stop =>
            terms.every(term =>
                new RegExp(`\\b${escapeRegex(term)}(\\s|$)`, "i").test(stop.stop_name)
            )
        )
        .map(stop => ({
            stop_id: displayStopId(stop.stop_id),
            stop_name: stop.stop_name,
            stop_lat: stop.stop_lat,
            stop_lon: stop.stop_lon,
            bearing: stopBearings?.[displayStopId(stop.stop_id)] ?? null,
        }))
        .slice(0, 20)

    res.json({ stops: results })
})

// Nearby stops by coordinates endpoint
app.get("/api/nearby-stops-by-coords", (req, res) => {
    const lat = parseFloat(req.query.lat)
    const lon = parseFloat(req.query.lon)
    const radius = parseFloat(req.query.radius) || 0.25
    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: "Invalid coordinates" })

    const nearbyStops = stops
        .map(stop => ({
            stop_id: displayStopId(stop.stop_id),
            stop_name: stop.stop_name,
            stop_lat: stop.stop_lat,
            stop_lon: stop.stop_lon,
            bearing: stopBearings?.[displayStopId(stop.stop_id)] ?? null,
            distance: getDistance(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon))
        }))
        .filter(stop => stop.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 20)

    res.json({ stops: nearbyStops })
})

// Go: list of curated destinations (static metadata only; no live data).
app.get("/api/destinations", (req, res) => {
    res.json({
        destinations: destinations.map(({ id, name, aliases, category, lat, lon, note }) =>
            ({ id, name, aliases, category, lat, lon, note }))
    })
})

// Go: plan a direct ride from the user's location to a curated destination.
// Returns ranked one-seat options with live arrivals. Phase 1 = direct rides only.
app.get("/api/trip-to/:destId", async (req, res) => {
    const destId = req.params.destId
    if (!isSafeId(destId) || !Object.prototype.hasOwnProperty.call(destinationsById, destId)) {
        return res.status(404).json({ error: "Unknown destination" })
    }
    const dest = destinationsById[destId]
    const lat = parseFloat(req.query.lat)
    const lon = parseFloat(req.query.lon)
    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "Invalid coordinates" })
    }

    const WALK_RADIUS_MI = 0.4
    const destStopIds = dest.destinationStops.map(s => s.stop_id)
    const destRoutes = new Set(dest.routes)

    // Boarding candidates: stops near the user, served by a destination route
    // heading the right way. Cap to the nearest dozen to bound OTS calls.
    const boarding = stops
        .map(stop => ({
            stop_id: displayStopId(stop.stop_id),
            stop_name: stop.stop_name,
            distance: getDistance(lat, lon, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon)),
        }))
        .filter(s => s.distance <= WALK_RADIUS_MI)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 12)
        .map(s => ({
            ...s,
            routes: [...destRoutes].filter(r => routeGoesToward(r, s.stop_id, destStopIds)),
        }))
        .filter(s => s.routes.length > 0)

    const publicDest = { id: dest.id, name: dest.name, category: dest.category, note: dest.note }

    if (boarding.length === 0) {
        return res.json({ destination: publicDest, options: [] })
    }

    // Live arrivals for the nearest boarding stops (cap at 6 to limit OTS load).
    const apiKey = process.env.THEBUS_API_KEY
    const settled = await Promise.allSettled(
        boarding.slice(0, 6).map(async b => {
            const url = new URL("http://api.thebus.org/arrivalsJSON/")
            url.searchParams.set("key", apiKey)
            url.searchParams.set("stop", b.stop_id)
            const r = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) })
            const data = await r.json()
            return { boarding: b, arrivals: data.arrivals || [] }
        })
    )

    const now = Date.now()
    const options = []
    for (const s of settled) {
        if (s.status !== "fulfilled") continue
        const { boarding: b, arrivals } = s.value
        for (const a of arrivals) {
            if (!b.routes.includes(a.route)) continue
            if (a.canceled === "1") continue
            const mins = Math.round((new Date(`${a.date} ${a.stopTime}`).getTime() - now) / 60000)
            if (isNaN(mins) || mins < 0) continue
            options.push({
                route: a.route,
                headsign: a.headsign,
                estimated: a.estimated === "1",
                vehicle: a.vehicle,
                trip: a.trip,
                shape: a.shape,
                latitude: a.latitude,
                longitude: a.longitude,
                minutes: mins,
                stopTime: a.stopTime,
                boarding: {
                    stop_id: b.stop_id,
                    stop_name: b.stop_name,
                    walk_miles: Math.round(b.distance * 100) / 100,
                },
            })
        }
    }

    // Keep the soonest departure per (route + boarding stop), then rank by a
    // rough "walk + wait" cost (~20 min/mile walking at 3 mph).
    const best = new Map()
    for (const o of options) {
        const key = `${o.route}@${o.boarding.stop_id}`
        if (!best.has(key) || o.minutes < best.get(key).minutes) best.set(key, o)
    }
    const ranked = [...best.values()]
        .sort((a, b) => (a.boarding.walk_miles * 20 + a.minutes) - (b.boarding.walk_miles * 20 + b.minutes))
        .slice(0, 4)

    res.json({ destination: publicDest, options: ranked })
})

// Stop info endpoint
app.get("/api/stop/:stopId", (req, res) => {
    const stopId = req.params.stopId
    if (!isSafeId(stopId)) return res.status(400).json({ error: "Invalid stop id" })
    const stop = getStopByDisplayId(stopId)
    if (!stop) return res.status(404).json({ error: "Stop not found" })
    res.json({ stop_id: displayStopId(stop.stop_id), stop_name: stop.stop_name })
})

// Service alerts endpoint — scrapes the public OTS rider alerts page since OTS
// doesn't publish the GTFS-Realtime feed URL. 5-minute in-memory cache; on
// upstream failure we serve stale cache rather than erroring out.
const ALERTS_URL = "https://www.thebus.org/RiderAlerts.asp"
const ALERTS_CACHE_MS = 5 * 60 * 1000
let alertsCache = { alerts: null, fetchedAt: 0 }

app.get("/api/alerts", async (req, res) => {
    const now = Date.now()
    if (alertsCache.alerts && now - alertsCache.fetchedAt < ALERTS_CACHE_MS) {
        return res.json({
            alerts: alertsCache.alerts,
            cached: true,
            stale: false,
            fetched_at: alertsCache.fetchedAt,
        })
    }
    try {
        const r = await fetch(ALERTS_URL, { signal: AbortSignal.timeout(10000) })
        if (!r.ok) throw new Error(`Upstream ${r.status}`)
        const html = await r.text()
        const parsed = parseAlerts(html, knownRouteShortNames)
        alertsCache = { alerts: parsed, fetchedAt: now }
        res.json({ alerts: parsed, cached: false, stale: false, fetched_at: now })
    } catch (_err) {
        // Better to serve a stale list than a hard error — alerts are advisory.
        if (alertsCache.alerts) {
            return res.json({
                alerts: alertsCache.alerts,
                cached: true,
                stale: true,
                fetched_at: alertsCache.fetchedAt,
            })
        }
        res.status(502).json({ error: "Could not fetch alerts" })
    }
})

const PORT = process.env.PORT || 3001
const USE_HTTPS = process.env.USE_HTTPS !== "false"

if (USE_HTTPS) {
    // Local dev: TLS via mkcert certs. Set USE_HTTPS=false in production
    // where TLS is terminated upstream (Railway, Render, etc.).
    const httpsOptions = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH || "./192.168.4.27+2-key.pem"),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH || "./192.168.4.27+2.pem"),
    }
    https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`Server running on https://localhost:${PORT}`)
    })
} else {
    http.createServer(app).listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`)
    })
}

