import { useState, useEffect } from "react";
import { API_BASE } from "../constants";

// Routes-tab data: the route list (fetched lazily the first time the routes
// tab opens), the selected route direction, and its stops/shape.
// View state (routeMapView etc.) stays in App — this hook owns data only.
export function useRoutes(setError, routesTabActive) {
  const [routes, setRoutes] = useState(null);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeStops, setRouteStops] = useState(null);
  const [routeShape, setRouteShape] = useState(null);
  const [routeStopsLoading, setRouteStopsLoading] = useState(false);

  const fetchRoutes = async () => {
    setRoutesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/routes`);
      const data = await res.json();
      setRoutes(data.routes);
    } catch {
      setError("Could not load routes.");
    } finally {
      setRoutesLoading(false);
    }
  };

  const fetchRouteStops = async (route) => {
    setSelectedRoute(route);
    setRouteStopsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/route/${route.route_id}/stops`);
      const data = await res.json();
      setRouteStops(data.stops);
      setRouteShape(data.shape || null);
    } catch {
      setError("Could not load stops for this route.");
    } finally {
      setRouteStopsLoading(false);
    }
  };

  // Fetch the routes list when the routes tab is first opened. The guard
  // prevents duplicate fetches; depending on routes/routesLoading here would
  // risk a refetch loop on persistent failure, so they're intentionally
  // omitted from the dep array.
  useEffect(() => {
    if (routesTabActive && !routes && !routesLoading) {
      fetchRoutes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routesTabActive]);

  // Deselect the route (data only — App also resets its routeMapView).
  const clearRouteSelection = () => {
    setSelectedRoute(null);
    setRouteStops(null);
    setRouteShape(null);
  };

  return {
    routes,
    setRoutes,
    routesLoading,
    selectedRoute,
    routeStops,
    routeShape,
    routeStopsLoading,
    fetchRoutes,
    fetchRouteStops,
    clearRouteSelection,
  };
}
