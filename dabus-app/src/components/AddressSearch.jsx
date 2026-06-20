import { createPortal } from "react-dom";
import { useRef, useEffect, useState } from "react";
import styles from "./AddressSearch.module.css";
import SearchInput from "./SearchInput";
import "../dabus-portal.css";

function AddressSearch({
  query,
  setQuery,
  onSearch,
  onClear,
  searching,
  nearbyStops,
  onSelectStop,
}) {
  const containerRef = useRef(null);
  const resultsRef = useRef(null);
  const [portalStyle, setPortalStyle] = useState({});
  // Tracks touch movement on result rows so a scroll gesture isn't mistaken
  // for a tap on touchend (see onTouchStart/Move/End below).
  const touchStateRef = useRef({ startY: 0, scrolled: false });

  useEffect(() => {
    if (!(nearbyStops && nearbyStops.length > 0 && containerRef.current)) return;

    const updatePosition = () => {
      const rect = containerRef.current.getBoundingClientRect();
      // Use visualViewport when available so the dropdown's max height
      // shrinks to the space actually visible above the on-screen keyboard,
      // instead of 60vh (full layout viewport) which extends underneath it.
      const viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;
      const availableHeight = Math.max(viewportHeight - rect.bottom - 8, 120);
      setPortalStyle({
        position: "fixed",
        top: `${rect.bottom}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        maxHeight: `${availableHeight}px`,
      });
    };

    updatePosition();
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [nearbyStops]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideContainer = containerRef.current?.contains(e.target);
      const clickedInsideResults = resultsRef.current?.contains(e.target);
      if (!clickedInsideContainer && !clickedInsideResults) {
        onClear();
      }
    };

    if (nearbyStops && nearbyStops.length > 0) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [nearbyStops]);

  const handleChange = (value) => {
    setQuery(value);
    if (value === "") onClear();
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <SearchInput
        value={query}
        onChange={handleChange}
        placeholder="Stop number or street name"
        onClear={onClear}
        onSubmit={onSearch}
      />

      {searching && <p className={styles.status}>Searching...</p>}
      {nearbyStops && nearbyStops.length === 0 && (
        <p className={styles.status}>No stops found.</p>
      )}
      {nearbyStops &&
        nearbyStops.length > 0 &&
        createPortal(
          <div
            className="dabus-results"
            ref={resultsRef}
            style={portalStyle}
            role="listbox"
            aria-label="Stop search results"
          >
            {nearbyStops.map((stop) => (
              <button
                key={stop.stop_id}
                type="button"
                className="dabus-result-item"
                onMouseDown={(e) => { e.preventDefault(); onSelectStop(stop.stop_id); }}
                onTouchStart={(e) => {
                  touchStateRef.current = { startY: e.touches[0].clientY, scrolled: false };
                }}
                onTouchMove={(e) => {
                  const dy = Math.abs(e.touches[0].clientY - touchStateRef.current.startY);
                  if (dy > 10) touchStateRef.current.scrolled = true;
                }}
                onTouchEnd={(e) => {
                  // Finger moved more than a few px — this was a scroll, not a tap.
                  // Let it pass through so the list keeps scrolling normally.
                  if (touchStateRef.current.scrolled) return;
                  e.preventDefault();
                  onSelectStop(stop.stop_id);
                }}
                role="option"
                aria-selected="false"
              >
                <div className="dabus-stop-name">
                  {stop.stop_name
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </div>
                <div className="dabus-stop-id">Stop #{stop.stop_id}</div>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default AddressSearch;
