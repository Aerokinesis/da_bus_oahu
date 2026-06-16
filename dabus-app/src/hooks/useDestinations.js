import { useState, useCallback, useMemo } from "react";
import { API_BASE } from "../constants";
import destinationsData from "../../destinations.json";

// Static metadata only — the heavy stop/route arrays stay server-side and are
// used by /api/trip-to. Importing keeps the list available offline.
const DESTINATIONS = destinationsData.map(
  ({ id, name, aliases, category, lat, lon, note }) => ({
    id,
    name,
    aliases,
    category,
    lat,
    lon,
    note,
  })
);

export function useDestinations() {
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState(null); // { destination, options }
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.aliases.some((a) => a.toLowerCase().includes(q))
    );
  }, [query]);

  // Plan a direct ride to destId from the given coordinates.
  const planTrip = useCallback(async (destId, lat, lon) => {
    setPlanLoading(true);
    setPlanError(null);
    setPlan(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/trip-to/${destId}?lat=${lat}&lon=${lon}`
      );
      if (!res.ok) throw new Error("trip-to failed");
      const data = await res.json();
      setPlan(data);
      return data;
    } catch {
      setPlanError("Couldn't plan this trip. Check your connection and try again.");
      return null;
    } finally {
      setPlanLoading(false);
    }
  }, []);

  const clearPlan = useCallback(() => {
    setPlan(null);
    setPlanError(null);
  }, []);

  return {
    destinations: DESTINATIONS,
    filtered,
    query,
    setQuery,
    plan,
    planLoading,
    planError,
    planTrip,
    clearPlan,
  };
}
