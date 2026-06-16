import styles from "./DestinationsTab.module.css";
import SearchInput from "./SearchInput";

// Small inline category icons (stroke = currentColor).
const ICONS = {
  shopping: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
  beach:
    "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1",
  school: "M22 10 12 5 2 10l10 5 10-5zM6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5",
  transit:
    "M4 16V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10M4 16h16M5 16v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2M16 16v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2M4 10h16",
  hike: "M3 20h18L14 7l-3 5-2-3-6 11z",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return { hi: "Mornin'!", sub: "Where you headed?" };
  if (h < 17) return { hi: "Howzit", sub: "Where you going?" };
  return { hi: "Pau hana?", sub: "Heading home or to the beach?" };
}

function DestinationsTab({ filtered, query, setQuery, onSelect }) {
  const { hi, sub } = greeting();

  return (
    <div className={styles.container}>
      <div className={styles.search}>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Where you going?"
          ariaLabel="Search destinations"
          onClear={() => setQuery("")}
        />
      </div>

      {!query && (
        <div className={styles.greeting}>
          <p className={styles.hi}>{hi}</p>
          <p className={styles.sub}>{sub}</p>
        </div>
      )}

      <p className={styles.sectionLabel}>
        {query ? "Results" : "Popular spots"}
      </p>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No spots match “{query}”.</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((d) => (
            <button
              key={d.id}
              className={styles.card}
              onClick={() => onSelect(d)}
            >
              <span className={styles.icon}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={ICONS[d.category] || ICONS.transit} />
                </svg>
              </span>
              <span className={styles.name}>{d.name}</span>
              {d.aliases?.[0] && (
                <span className={styles.alias}>{d.aliases[0]}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DestinationsTab;
