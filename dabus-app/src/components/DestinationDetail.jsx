import styles from "./DestinationDetail.module.css";
import BackButton from "./BackButton";

function minutesLabel(mins) {
  if (mins <= 0) return "Now";
  if (mins === 1) return "1 min";
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function walkLabel(miles) {
  const mins = Math.max(1, Math.round(miles * 20)); // ~3 mph
  return `Walk ~${mins} min`;
}

// Shape an option into the bus object useBusTracking expects.
function busFor(o) {
  return {
    id: `${o.route}-${o.vehicle}`,
    route: o.route,
    headsign: o.headsign,
    estimated: o.estimated ? "1" : "0",
    vehicle: o.vehicle,
    trip: o.trip,
    shape: o.shape,
    latitude: o.latitude,
    longitude: o.longitude,
  };
}

function DestinationDetail({
  plan,
  planLoading,
  planError,
  onBack,
  onTrack,
  selectedBus,
  trackingLoading,
}) {
  const dest = plan?.destination;
  const options = plan?.options || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <BackButton onClick={onBack} />
        <span className={styles.title}>{dest?.name || "Destination"}</span>
      </div>

      {dest?.note && (
        <div className={styles.note}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{dest.note}</span>
        </div>
      )}

      {planLoading && <p className={styles.status}>Finding your bus…</p>}
      {planError && (
        <p className={styles.status} role="alert">
          {planError}
        </p>
      )}

      {!planLoading && !planError && options.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No direct buses right now</p>
          <p className={styles.emptyHint}>
            There’s no one-seat ride to {dest?.name || "this spot"} from where you
            are at the moment. Service may be on a break, or it may need a
            transfer.
          </p>
        </div>
      )}

      <div className={styles.list}>
        {options.map((o, i) => {
          const bus = busFor(o);
          const tracking = selectedBus?.id === bus.id;
          return (
            <div
              key={`${o.route}-${o.boarding.stop_id}-${i}`}
              className={`${styles.card} ${i === 0 ? styles.best : ""}`}
            >
              {i === 0 && <span className={styles.bestTag}>Best ride</span>}

              <div className={styles.walkRow}>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="13" cy="4" r="2" />
                  <path d="M7 21l3-6 2-3 1 4 3 2M10 12l-1-4-3 2-1 3" />
                </svg>
                <span>
                  {walkLabel(o.boarding.walk_miles)} to {o.boarding.stop_name}
                </span>
              </div>

              <div className={styles.rideRow}>
                <span className={styles.routeBadge}>{o.route}</span>
                <div className={styles.rideInfo}>
                  <span className={styles.headsign}>{o.headsign}</span>
                  <span
                    className={`${styles.liveTag} ${o.estimated ? styles.live : styles.sched}`}
                  >
                    {o.estimated ? `● Live · Bus #${o.vehicle}` : "○ Scheduled"}
                  </span>
                </div>
                <div className={styles.timing}>
                  <span className={styles.minutes}>{minutesLabel(o.minutes)}</span>
                  <span className={styles.clock}>{o.stopTime}</span>
                </div>
              </div>

              {o.estimated && (
                <div className={styles.actions}>
                  {tracking ? (
                    <span className={styles.trackingPill}>
                      {trackingLoading ? "Loading…" : "● Tracking"}
                    </span>
                  ) : (
                    <button
                      className={styles.trackBtn}
                      onClick={() => onTrack(bus)}
                      disabled={trackingLoading}
                    >
                      Track
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DestinationDetail;
