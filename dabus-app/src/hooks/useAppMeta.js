import { useState, useEffect } from "react";
import { API_BASE } from "../constants";

// Fetches GTFS feed vintage so Settings can show a "Data updated" date that
// stays accurate without editing a hardcoded string on every refresh.
export function useAppMeta() {
  const [dataUpdated, setDataUpdated] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/meta`)
      .then((r) => r.json())
      .then((data) => {
        const raw = data.gtfs_feed_start_date; // e.g. "20260520"
        if (!raw || raw.length !== 8) return;
        const year = raw.slice(0, 4);
        const month = parseInt(raw.slice(4, 6), 10) - 1;
        const date = new Date(Number(year), month, 1);
        setDataUpdated(
          date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        );
      })
      .catch(() => {});
  }, []);

  return dataUpdated;
}
