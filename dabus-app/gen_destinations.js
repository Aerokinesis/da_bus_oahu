// Generate a verified destinations.json from the real TheBus GTFS feed.
// For each curated Oahu destination, find stops within RADIUS_M and the routes
// (route_short_name) whose ordered stop sequence passes through one of them.
//
// Run from dabus-app/: node gen_destinations.js  (reads ./data/*, writes ./destinations.json)

const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "data");
const RADIUS_M = 250; // how close a stop must be to count as "at" the destination

// --- tiny CSV parser (stops.txt only; small) --------------------------------
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    // stops.txt has no embedded commas in the fields we use; simple split is safe here
    const cells = line.split(",");
    const o = {};
    headers.forEach((h, i) => (o[h] = cells[i]));
    return o;
  });
}

const stops = parseCSV(fs.readFileSync(path.join(DATA, "stops.txt"), "utf8"));
const { routeDirections } = JSON.parse(fs.readFileSync(path.join(DATA, "processed.json"), "utf8"));
const displayId = (id) => (typeof id === "string" ? id.replace(/_merge$/, "") : id);

// haversine in meters
function distM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Build a quick lookup: displayStopId -> {lat, lon, name}
const stopById = {};
for (const s of stops) {
  const id = displayId(s.stop_id);
  const lat = parseFloat(s.stop_lat);
  const lon = parseFloat(s.stop_lon);
  if (isNaN(lat) || isNaN(lon)) continue;
  if (!stopById[id]) stopById[id] = { id, lat, lon, name: s.stop_name };
}

// For a stop id, which route_short_names serve it (any direction)?
// routeDirections[].stops is the ordered, de-duped stop list per direction.
const routesByStop = {};
for (const rd of routeDirections) {
  const name = rd.route_short_name || rd.headsign || rd.route_id;
  for (const st of rd.stops) {
    const id = displayId(st.stop_id);
    if (!routesByStop[id]) routesByStop[id] = new Set();
    if (rd.route_short_name) routesByStop[id].add(rd.route_short_name);
  }
}

// --- curated destinations (hand-authored; lat/lon are real Oahu landmarks) ---
const DESTINATIONS = [
  { id: "ala-moana", name: "Ala Moana Center", aliases: ["ala mo", "the mall", "shopping center"], category: "shopping", lat: 21.29139, lon: -157.84361, note: "Ala Moana Transit Center sits behind the mall — most routes stop here." },
  { id: "waikiki", name: "Waikiki", aliases: ["the beach", "kuhio ave", "waikiki beach"], category: "beach", lat: 21.27831, lon: -157.82481, note: "Kūhiō Ave is the main bus corridor through Waikiki." },
  { id: "uh-manoa", name: "UH Mānoa", aliases: ["the university", "uh", "manoa campus"], category: "school", lat: 21.29716, lon: -157.82109, note: "University Ave + Dole St is the closest stop to most of campus." },
  { id: "hnl-airport", name: "Honolulu Airport (HNL)", aliases: ["the airport", "hnl", "daniel inouye"], category: "transit", lat: 21.33432, lon: -157.92081, note: "Use the Lelepaua airport station; it's a walk from the terminals." },
  { id: "downtown", name: "Downtown Honolulu", aliases: ["town", "downtown", "the city"], category: "transit", lat: 21.30739, lon: -157.85831, note: "King St and Hotel St carry most downtown routes." },
  { id: "diamond-head", name: "Diamond Head", aliases: ["leahi", "the crater", "diamond head hike"], category: "hike", lat: 21.26968, lon: -157.81360, note: "Route 23 runs up Monsarrat Ave; it's still a walk to the trailhead." },
  { id: "kahala-mall", name: "Kāhala Mall", aliases: ["kahala", "kahala mall"], category: "shopping", lat: 21.27852, lon: -157.78848, note: null },
  { id: "pearlridge", name: "Pearlridge Center", aliases: ["pearlridge", "the aiea mall"], category: "shopping", lat: 21.38389, lon: -157.94556, note: "Skyline now reaches Pearlridge — check rail too." },
  { id: "windward-mall", name: "Windward Mall", aliases: ["windward mall", "kaneohe mall"], category: "shopping", lat: 21.40139, lon: -157.79778, note: null },
  { id: "kapiolani-park", name: "Kapiolani Park", aliases: ["kapiolani", "the zoo", "waikiki shell"], category: "beach", lat: 21.26847, lon: -157.81975, note: "Closest stops are along Kalākaua near the zoo and aquarium." },
  { id: "ala-moana-beach", name: "Ala Moana Beach Park", aliases: ["magic island", "ala moana beach"], category: "beach", lat: 21.28958, lon: -157.84639, note: "Cross Ala Moana Blvd from the Transit Center side." },
  { id: "chinatown", name: "Chinatown", aliases: ["chinatown", "maunakea st"], category: "transit", lat: 21.31389, lon: -157.86250, note: "Hotel St is the main stop corridor." },
  { id: "kalihi-transit", name: "Kalihi Transit Center", aliases: ["kalihi", "kalihi transit"], category: "transit", lat: 21.33274, lon: -157.88881, note: "Major transfer hub and a Skyline station." },
  { id: "kapolei", name: "Kapolei", aliases: ["the second city", "kapolei"], category: "transit", lat: 21.33196, lon: -158.08226, note: "Kapolei Transit Center; west-side hub for many routes." },
  { id: "hawaii-kai", name: "Hawaii Kai", aliases: ["hawaii kai", "koko marina"], category: "shopping", lat: 21.28000, lon: -157.70972, note: "Koko Marina Center is the main stop cluster." },
];

const out = [];
for (const d of DESTINATIONS) {
  // stops within radius, nearest first
  const near = Object.values(stopById)
    .map((s) => ({ ...s, dist: Math.round(distM(d.lat, d.lon, s.lat, s.lon)) }))
    .filter((s) => s.dist <= RADIUS_M)
    .sort((a, b) => a.dist - b.dist);

  // union of routes serving any nearby stop
  const routeSet = new Set();
  for (const s of near) for (const r of routesByStop[s.id] || []) routeSet.add(r);
  const routes = [...routeSet].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  out.push({
    id: d.id,
    name: d.name,
    aliases: d.aliases,
    category: d.category,
    lat: d.lat,
    lon: d.lon,
    note: d.note,
    destinationStops: near.map((s) => ({ stop_id: s.id, name: s.name, dist_m: s.dist })),
    routes,
  });
}

fs.writeFileSync(path.join(__dirname, "destinations.json"), JSON.stringify(out, null, 2));

// console summary
for (const d of out) {
  console.log(
    `${d.name.padEnd(26)} stops:${String(d.destinationStops.length).padStart(2)}  routes:${d.routes.length ? d.routes.join(",") : "(none in radius)"}`
  );
}
console.log(`\nWrote destinations.json with ${out.length} destinations (radius ${RADIUS_M}m).`);
