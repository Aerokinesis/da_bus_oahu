import styles from "./Favorites.module.css";

function Favorites({ favorites, onSelectStop, onRemoveFavorite, onClearFavorites }) {
  if (favorites.length === 0)
    return <div className={styles.empty}>No saved stops yet.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Favorites</span>
        <button className={styles.clearBtn} onClick={onClearFavorites}>
          Clear all
        </button>
      </div>
      {favorites.map((fav) => (
        <div key={fav.stop_id} className={styles.row}>
          <button
            type="button"
            className={styles.info}
            onClick={() => onSelectStop(fav.stop_id)}
          >
            <span className={styles.name}>{fav.custom_name}</span>
            <span className={styles.meta}>
              {fav.name} • Stop #{fav.stop_id}
            </span>
          </button>
          <button
            className={styles.removeBtn}
            onClick={() => onRemoveFavorite(fav.stop_id)}
            aria-label={`Remove ${fav.custom_name} from favorites`}
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export default Favorites;
