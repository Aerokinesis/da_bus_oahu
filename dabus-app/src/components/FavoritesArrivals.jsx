import { useState } from "react";
import styles from "./FavoritesArrivals.module.css";

function formatMinutes(mins) {
  if (mins <= 0) return "Now";
  if (mins === 1) return "1 min";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hours} hr` : `${hours} hr ${rem} min`;
}

// Favorites list with each stop's next arrivals shown inline, so the user
// can see what's coming everywhere without opening each favorite in turn.
function FavoritesArrivals({
  favorites,
  stopArrivals,
  loading,
  lastUpdated,
  onRefresh,
  onSelectStop,
  onRemoveFavorite,
}) {
  const [refreshing, setRefreshing] = useState(false);
  // Folded stop IDs — collapsed by default is empty (everything expanded).
  const [collapsed, setCollapsed] = useState(() => new Set());

  const toggleCollapsed = (stopId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(stopId)) next.delete(stopId);
      else next.add(stopId);
      return next;
    });
  };

  if (favorites.length === 0)
    return <div className={styles.empty}>No saved stops yet.</div>;

  return (
    <div className={styles.container}>
      {lastUpdated && (
        <div className={styles.lastUpdatedRow}>
          <span className={styles.lastUpdated}>
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            className={styles.refreshBtn}
            aria-label="Refresh all favorites"
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true);
              await onRefresh();
              setRefreshing(false);
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={refreshing ? styles.spinning : ""}
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      )}

      <div className={styles.list}>
        {favorites.map((fav) => {
          const entry = stopArrivals[fav.stop_id];
          const routes = entry?.routes || [];
          const isCollapsed = collapsed.has(fav.stop_id);

          return (
            <div key={fav.stop_id} className={styles.card}>
              <div
                className={styles.cardHeader}
                onClick={() => onSelectStop(fav.stop_id)}
              >
                <button
                  className={styles.chevronBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapsed(fav.stop_id);
                  }}
                  aria-label={
                    isCollapsed
                      ? `Show arrivals for ${fav.custom_name}`
                      : `Hide arrivals for ${fav.custom_name}`
                  }
                  aria-expanded={!isCollapsed}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`${styles.chevron} ${
                      isCollapsed ? styles.chevronCollapsed : ""
                    }`}
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div className={styles.text}>
                  <span className={styles.name}>{fav.custom_name}</span>
                  <span className={styles.meta}>
                    {fav.name} • Stop #{fav.stop_id}
                  </span>
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFavorite(fav.stop_id);
                  }}
                  aria-label={`Remove ${fav.custom_name} from favorites`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>

              {isCollapsed ? null : entry?.error ? (
                <div className={styles.errorRow}>{entry.error}</div>
              ) : routes.length === 0 ? (
                <div className={styles.emptyRow}>
                  {loading && !entry ? "Loading…" : "No upcoming buses"}
                </div>
              ) : (
                <div
                  className={styles.routes}
                  onClick={() => onSelectStop(fav.stop_id)}
                >
                  {routes.map((r) => (
                    <div key={r.route} className={styles.routeRow}>
                      <span className={styles.routeBadge}>{r.route}</span>
                      <span className={styles.headsign}>{r.headsign}</span>
                      {r.isCanceled ? (
                        <span className={styles.canceledTag}>Canceled</span>
                      ) : (
                        <>
                          <span
                            className={`${styles.dot} ${
                              r.isLive ? styles.live : styles.scheduled
                            }`}
                          />
                          <span className={styles.time}>
                            {formatMinutes(r.mins)}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FavoritesArrivals;
