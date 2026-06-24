import { useState, useEffect, useCallback, useRef } from "react";

import { API_BASE } from "../constants";

// How far in the past an arrival can be and still count as "upcoming" —
// guards against a bus that just departed lingering in the summary.
const STALE_PAST_MIN = -2;
// Show at most this many distinct routes per favorite stop, soonest first.
const MAX_ROUTES_PER_STOP = 3;
const REFRESH_MS = 30000;

function minutesUntil(stopTime, date) {
  const t = new Date(`${date} ${stopTime}`).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 60000);
}

// Collapse a stop's raw arrivals feed into one soonest entry per route —
// this is a glance view, not the full per-stop arrivals list.
function summarizeArrivals(rawArrivals) {
  const byRoute = new Map();

  for (const bus of rawArrivals || []) {
    const mins = minutesUntil(bus.stopTime, bus.date);
    if (mins === null || mins < STALE_PAST_MIN) continue;

    const isLive = bus.estimated === "1";
    // Same nuance as the main arrivals list: TheBus marks the scheduled
    // block canceled even when a vehicle still runs it, so only trust the
    // cancel flag when live GPS confirms it.
    const isCanceled = bus.canceled === "1" && isLive;

    const existing = byRoute.get(bus.route);
    if (!existing || mins < existing.mins) {
      byRoute.set(bus.route, {
        route: bus.route,
        headsign: bus.headsign,
        mins,
        isLive,
        isCanceled,
      });
    }
  }

  return [...byRoute.values()]
    .sort((a, b) => a.mins - b.mins)
    .slice(0, MAX_ROUTES_PER_STOP);
}

// Fetches next-arrival summaries for every favorite stop in parallel, so a
// favorites list can show inline arrivals without the user opening each
// stop individually. `enabled` gates the polling — pass false when the
// favorites list isn't on screen to avoid background fetches.
export function useFavoritesArrivals(favorites, enabled) {
  const [stopArrivals, setStopArrivals] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Read the latest favorites inside the interval without re-creating it.
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  const fetchAll = useCallback(async () => {
    const favs = favoritesRef.current || [];
    if (favs.length === 0) {
      setStopArrivals({});
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        favs.map((f) =>
          fetch(`${API_BASE}/api/arrivals?stop=${f.stop_id}`).then((res) => {
            if (!res.ok) throw new Error(`bad response for stop ${f.stop_id}`);
            return res.json();
          }),
        ),
      );

      const next = {};
      favs.forEach((f, i) => {
        const result = results[i];
        if (result.status === "fulfilled") {
          next[f.stop_id] = {
            routes: summarizeArrivals(result.value.arrivals),
            error: null,
          };
        } else {
          next[f.stop_id] = { routes: [], error: "Couldn't load arrivals" };
        }
      });

      setStopArrivals(next);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(interval);
  }, [enabled, fetchAll, favorites.length]);

  return { stopArrivals, loading, lastUpdated, refresh: fetchAll };
}
