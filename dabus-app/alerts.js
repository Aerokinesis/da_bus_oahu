// Parsers for TheBus's public rider-alert pages.
//
// We can't get the official GTFS-Realtime alerts feed without OTS handing out
// the URL, so this scrapes the human-facing HTML pages they publish to riders
// and normalizes both into the shape the frontend expects.
//
// As of mid-2026, OTS split what used to be one page (RiderAlerts.asp, which
// listed every alert directly) into three:
//   - RiderAlerts.asp itself is now just a landing page with links to the three
//     pages below — it has no alert content of its own.
//   - RiderAlerts_Listing.asp — holidays, surveys, general advance notices.
//     Still lists each alert as a link whose href contains
//     "HTMLFILE/TheBus/Files/"; the URL filename (e.g. "639159179827902691")
//     is a stable ID we use for dismissal tracking. Parsed by parseListingAlerts.
//   - Updates/ServiceDisruption.asp — the route-specific detours and bus stop
//     closures (e.g. "Route 1"-style alerts). This page has no links or IDs at
//     all — each entry is a <p> block: a bold "<date> - <type> <location>"
//     header, then "Route(s) ..." and a description, separated by <br>. Parsed
//     by parseDisruptionAlerts, which derives a stable ID by hashing the
//     header + route list (the closest thing to a natural key OTS gives us).

import { createHash } from "node:crypto"

import * as cheerio from "cheerio"

// Category heuristics applied to the alert title. Order matters — first match wins.
const CATEGORY_RULES = [
    { test: /(bus stop closure|bus stop modification|new bus stop)/i, category: "stop_modification" },
    { test: /road closure/i, category: "road_closure" },
    { test: /service change/i, category: "service_change" },
    { test: /holiday/i, category: "holiday" },
    { test: /(rider alert|detour|reroute|construction|closure)/i, category: "rider_alert" },
]

// Short human label used on Route-tab badges and inline pills.
const CATEGORY_LABEL = {
    rider_alert: "Alert",
    stop_modification: "Stop change",
    road_closure: "Road closure",
    service_change: "Service change",
    holiday: "Holiday",
    other: "Notice",
}

const categorize = (title) => {
    for (const { test, category } of CATEGORY_RULES) {
        if (test.test(title)) return category
    }
    return "other"
}

const collapseSpace = (str) => (str || "").replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim()

const titleCase = (str) => str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

// ── Route-token parsing, shared by both pages ────────────────────────────────
// Buckets route tokens into ones we recognize from the loaded GTFS (frontend can
// deep-link these) vs ones we can only display as plain text.
const bucketRouteTokens = (tokens, knownRoutes) => {
    const inGtfs = new Set()
    const mentioned = new Set()
    for (let token of tokens) {
        token = token.trim()
        if (!token) continue
        const upper = token.toUpperCase()
        const lineMatch = upper.match(/^([A-Z]{1,2})\s+LINE$/)
        if (lineMatch) {
            const letter = lineMatch[1]
            if (knownRoutes.has(letter)) inGtfs.add(letter)
            else mentioned.add(upper)
            continue
        }
        if (knownRoutes.has(upper)) inGtfs.add(upper)
        else mentioned.add(upper)
    }
    return {
        affected_routes: [...inGtfs].sort(),
        affected_route_names: [...mentioned].sort(),
    }
}

// ── RiderAlerts_Listing.asp ──────────────────────────────────────────────────

// Pull the stable numeric filename out of the URL, e.g.
// ".../Files/639159179827902691/639159179827902691.htm" -> "639159179827902691"
const extractListingId = (url) => {
    const m = url.match(/\/Files\/(\d+)\//)
    return m ? m[1] : url
}

// Find a date in the title like "5/31/2026" and return it as YYYY-MM-DD.
const extractListingPostedDate = (title) => {
    const m = title.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
    if (!m) return null
    const [, month, day, year] = m
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

// Walk the title looking for route mentions. Two shapes:
//   "Route 1", "Route 1L", "Route 317", "Route PH8"  -> 1, 1L, 317, PH8
//   "A Line", "U Line", "W Line"                       -> A, U, W
const extractListingRoutes = (title, knownRoutes) => {
    const tokens = []
    const routeRe = /\bRoute\s+([A-Z]{0,3}\d{0,4}[A-Z]?)\b/gi
    let m
    while ((m = routeRe.exec(title)) !== null) {
        if (m[1]) tokens.push(m[1])
    }
    const lineRe = /\b([A-Z]{1,2})\s+Line\b/g
    while ((m = lineRe.exec(title)) !== null) {
        tokens.push(`${m[1]} LINE`)
    }
    return bucketRouteTokens(tokens, knownRoutes)
}

// Parse RiderAlerts_Listing.asp into normalized alert objects.
// `knownRoutes` is a Set of route_short_name strings from the loaded GTFS.
export function parseListingAlerts(html, knownRoutes) {
    const $ = cheerio.load(html)
    const seen = new Set()
    const alerts = []

    $("a").each((_, el) => {
        const href = $(el).attr("href") || ""
        if (!href.includes("HTMLFILE/TheBus/Files/")) return
        const title = $(el).text().trim()
        if (!title) return

        const id = extractListingId(href)
        if (seen.has(id)) return
        seen.add(id)

        const url = href.startsWith("http") ? href : `https://www.thebus.org${href.startsWith("/") ? "" : "/"}${href}`
        const category = categorize(title)
        const { affected_routes, affected_route_names } = extractListingRoutes(title, knownRoutes)

        alerts.push({
            id,
            title,
            url,
            category,
            category_label: CATEGORY_LABEL[category] || CATEGORY_LABEL.other,
            affected_routes,
            affected_route_names,
            posted_date: extractListingPostedDate(title),
        })
    })

    return alerts
}

// ── Updates/ServiceDisruption.asp ────────────────────────────────────────────

const MONTHS = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
}

// "September 2, 2026" -> "2026-09-02". Returns null if it doesn't parse.
const parseLongDate = (str) => {
    const m = collapseSpace(str).match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/)
    if (!m) return null
    const month = MONTHS[m[1].toLowerCase()]
    if (!month) return null
    return `${m[3]}-${month}-${m[2].padStart(2, "0")}`
}

// Header looks like "September 2, 2026 08:30am - BUS STOP CLOSURE  LOCATION" or
// "July 27, 2026  - ROAD CLOSURE - MAHUKONA STREET" (no time). Split off the
// leading date (and optional time) from the type/location text that follows.
const splitDisruptionHeader = (headerText) => {
    const header = collapseSpace(headerText)
    const m = header.match(/^([A-Za-z]+ \d{1,2}, \d{4})(?:\s+(\d{1,2}:\d{2}\s*[ap]m))?\s*-\s*(.+)$/i)
    if (!m) return { posted_date: null, title: header }
    return { posted_date: parseLongDate(m[1]), title: m[3].trim() }
}

// "Route(s) 51, 52, 99, 511, 512, PH3." -> ["51", "52", "99", "511", "512", "PH3"]
const parseDisruptionRouteTokens = (routesLine) => {
    const cleaned = collapseSpace(routesLine).replace(/^Route\(s\)\s*/i, "").replace(/\.\s*$/, "")
    return cleaned.split(",").map((t) => t.trim()).filter(Boolean)
}

// Parse Updates/ServiceDisruption.asp into normalized alert objects. Unlike the
// listing page, entries here have no href or ID of their own, so we derive a
// stable ID by hashing the header + route list — the two pieces together are
// unique per entry even when OTS reuses an identical header for two route
// groups (it does, e.g. separate Eastbound/Westbound closures at one location).
export function parseDisruptionAlerts(html, knownRoutes) {
    const $ = cheerio.load(html)
    const alerts = []

    $(".card-body p").each((_, el) => {
        const pHtml = $.html(el)
        const boldMatch = pHtml.match(/<b>([\s\S]*?)<\/b>/i)
        if (!boldMatch) return

        const headerText = collapseSpace(cheerio.load(`<div>${boldMatch[1]}</div>`)("div").text())
        if (!headerText) return

        const rest = pHtml.slice(pHtml.indexOf("</b>") + 4)
        const parts = rest
            .split(/<br\s*\/?>/i)
            .map((part) => collapseSpace(cheerio.load(`<div>${part}</div>`)("div").text()))
            .filter(Boolean)

        const routesLine = parts[0] || ""
        const description = parts.slice(1).join(" ").trim()
        if (!/^Route\(s\)/i.test(routesLine)) return // not a well-formed entry, skip rather than guess

        const { posted_date, title: rawTitle } = splitDisruptionHeader(headerText)
        const title = titleCase(rawTitle)
        const category = categorize(headerText)
        const routeTokens = parseDisruptionRouteTokens(routesLine)
        const { affected_routes, affected_route_names } = bucketRouteTokens(routeTokens, knownRoutes)

        const id = `sd-${createHash("sha1").update(`${headerText}|${routesLine}`).digest("hex").slice(0, 12)}`

        alerts.push({
            id,
            title,
            url: "https://www.thebus.org/Updates/ServiceDisruption.asp",
            category,
            category_label: CATEGORY_LABEL[category] || CATEGORY_LABEL.other,
            affected_routes,
            affected_route_names,
            posted_date,
            description,
        })
    })

    return alerts
}

// Merge both sources, newest first (entries without a parsed date sort last).
export function mergeAlerts(...lists) {
    const all = lists.flat()
    return all.sort((a, b) => {
        if (a.posted_date && b.posted_date) return b.posted_date.localeCompare(a.posted_date)
        if (a.posted_date) return -1
        if (b.posted_date) return 1
        return 0
    })
}
