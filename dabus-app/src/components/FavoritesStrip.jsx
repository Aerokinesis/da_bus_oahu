import styles from "./FavoritesStrip.module.css";
import { formatEta, nextBuses, titleCaseStop } from "./arrivalGlance";

// Home-screen strip: the first three favorites with their next arrival at a
// glance, plus a trailing card that opens the Favorites tab.
function FavoritesStrip({ favorites, arrivalsByStop, onSelectStop, onSeeAll }) {
  if (!favorites || favorites.length === 0) return null;
  const pinned = favorites.slice(0, 3);

  return (
    <div className={styles.strip} role="list" aria-label="Favorite stops">
      {pinned.map((fav) => {
        const arrivals = arrivalsByStop[fav.stop_id];
        const buses = nextBuses(arrivals);
        const next = buses[0];
        const after = buses[1];
        const isLive = next?.estimated === "1";

        return (
          <button
            key={fav.stop_id}
            role="listitem"
            className={styles.card}
            onClick={() => onSelectStop(fav.stop_id)}
          >
            <span className={styles.name}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"
                stroke="currentColor" strokeWidth="2" aria-hidden="true"
                className={styles.heart}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {fav.custom_name || titleCaseStop(fav.name, fav.stop_id)}
            </span>
            {arrivals === undefined ? (
              <span className={styles.loading}>Loading…</span>
            ) : arrivals === null ? (
              <span className={styles.loading}>Unavailable</span>
            ) : !next ? (
              <span className={styles.loading}>No buses</span>
            ) : (
              <>
                <span className={styles.route}>
                  Rt {next.route}{next.headsign ? ` · ${next.headsign}` : ""}
                </span>
                <span className={styles.etaRow}>
                  <span className={isLive ? styles.etaLive : styles.etaSched}>
                    {formatEta(next)}
                  </span>
                  {after && (
                    <span className={styles.then}>then {formatEta(after)}</span>
                  )}
                </span>
              </>
            )}
          </button>
        );
      })}

      <button className={`${styles.card} ${styles.seeAll}`} onClick={onSeeAll}>
        <span className={styles.seeAllLabel}>
          All favorites
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        <span className={styles.seeAllCount}>{favorites.length} saved</span>
      </button>
    </div>
  );
}

export default FavoritesStrip;
