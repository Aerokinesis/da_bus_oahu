import styles from "./NearestStopCard.module.css";
import { formatEta, titleCaseStop } from "./arrivalGlance";

// Home-screen card under the map: the closest stop's next arrivals without
// having to tap its marker. `stop` is the nearest entry from
// /api/nearby-stops-by-coords (already sorted by distance).
const WALK_MPH = 3;

function NearestStopCard({ stop, arrivals, onOpen }) {
  if (!stop) return null;

  const walkMin = Math.max(1, Math.round((stop.distance / WALK_MPH) * 60));
  const upcoming = arrivals
    ? arrivals.filter((b) => !b.arrived).slice(0, 3)
    : null;

  return (
    <button className={styles.card} onClick={() => onOpen(stop.stop_id)}>
      <div className={styles.header}>
        <span className={styles.title}>
          {titleCaseStop(stop.stop_name, stop.stop_id)}
          <span className={styles.stopId}> · #{stop.stop_id}</span>
        </span>
        <span className={styles.walk}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <circle cx="13" cy="4" r="2" />
            <path d="M10.5 8.5l-2 4 3 2.5V21" />
            <path d="M13 7l2.5 3.5 3 1" />
            <path d="M8.5 12.5L6 15" />
          </svg>
          {walkMin} min
        </span>
      </div>

      {!upcoming ? (
        <p className={styles.empty}>Loading arrivals…</p>
      ) : upcoming.length === 0 ? (
        <p className={styles.empty}>No upcoming buses at this stop.</p>
      ) : (
        <div className={styles.rows}>
          {upcoming.map((bus) => (
            <div key={bus.id} className={styles.row}>
              <span className={styles.badge}>{bus.route}</span>
              <span className={styles.headsign}>{bus.headsign}</span>
              <span
                className={
                  bus.estimated === "1" ? styles.etaLive : styles.etaSched
                }
              >
                {formatEta(bus)}
              </span>
            </div>
          ))}
        </div>
      )}

      <span className={styles.more}>All arrivals →</span>
    </button>
  );
}

export default NearestStopCard;
