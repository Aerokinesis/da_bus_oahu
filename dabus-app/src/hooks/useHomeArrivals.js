import { useState, useEffect } from "react";
import { API_BASE } from "../constants";

// Home-screen glance data: next arrivals for a small set of stops (pinned
// favorites + nearest stop). Lighter than useArrivals — no stop-name fetch,
// no arrived-bus retention — and refreshes on a slower cadence.
const REFRESH_MS = 60 * 1000;

export function useHomeArrivals(stopIdsKey, enabled) {
  // { [stopId]: arrivals[] | null }  — null marks a failed fetch,
  // a missing key means still loading.
  const [byStop, setByStop] = useState({});

  useEffect(() => {
    const stopIds = stopIdsKey ? stopIdsKey.split(",") : [];
    if (!enabled || stopIds.length === 0) return;
    let cancelled = false;

    const load = async () => {
      const results = await Promise.all(
        stopIds.map(async (id) => {
          try {
            const res = await fetch(`${API_BASE}/api/arrivals?stop=${id}`);
            const data = await res.json();
            return [id, data.arrivals || []];
          } catch {
            return [id, null];
          }
        }),
      );
      if (!cancelled) setByStop(Object.fromEntries(results));
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [stopIdsKey, enabled]);

  return byStop;
}
