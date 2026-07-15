// Shared helpers for the home-screen glance components.

// "4 min" / "Now" countdown, or the clock time when parsing fails or the
// bus is over an hour and a half out (matches ArrivalsList conventions).
export function formatEta(bus) {
  const t = new Date(`${bus.date} ${bus.stopTime}`).getTime();
  if (Number.isNaN(t)) return bus.stopTime;
  const diff = Math.round((t - Date.now()) / 60000);
  if (diff <= 0) return "Now";
  if (diff > 90) return bus.stopTime;
  return `${diff} min`;
}

// First two upcoming (non-arrived) buses from a raw feed.
export function nextBuses(arrivals) {
  if (!arrivals) return [];
  return arrivals.filter((b) => !b.arrived).slice(0, 2);
}

export function titleCaseStop(raw, stopId) {
  return raw
    ? raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : `Stop #${stopId}`;
}
