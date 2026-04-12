"use client";

import { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – leaflet CSS has no type declarations; imported for side effects
import "leaflet/dist/leaflet.css";
import { MapPin, Clock, Route, Loader2 } from "lucide-react";

// Fix Leaflet default icon in Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Green icon for source
const sourceIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Red icon for destination
const destinationIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RouteInfo {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
}

export interface RequestRouteMapProps {
  sourceCoords: { latitude: number; longitude: number };
  destinationCoords: { latitude: number; longitude: number };
  sourceLabel?: string;
  destinationLabel?: string;
  translations: {
    routeMap?: string;
    distance?: string;
    estimatedTime?: string;
    source?: string;
    destination?: string;
    loadingRoute?: string;
    straightLineEstimate?: string;
    hours?: string;
    minutes?: string;
    km?: string;
  };
}

function FitBounds({
  source,
  destination,
}: {
  source: [number, number];
  destination: [number, number];
}) {
  const map = useMap();
  const hasFit = useRef(false);

  useEffect(() => {
    if (hasFit.current) return;
    try {
      const bounds = L.latLngBounds([source, destination]);
      setTimeout(() => {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        hasFit.current = true;
      }, 100);
    } catch (e) {
      console.error("Error fitting map bounds:", e);
    }
  }, [map, source, destination]);

  return null;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function RequestRouteMap({
  sourceCoords,
  destinationCoords,
  sourceLabel,
  destinationLabel,
  translations: t,
}: RequestRouteMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeError, setRouteError] = useState(false);

  const srcLat = sourceCoords.latitude;
  const srcLng = sourceCoords.longitude;
  const dstLat = destinationCoords.latitude;
  const dstLng = destinationCoords.longitude;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch driving route from OSRM (free, no API key)
  useEffect(() => {
    let cancelled = false;

    async function fetchRoute() {
      setIsLoading(true);
      setRouteError(false);

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${srcLng},${srcLat};${dstLng},${dstLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM request failed");
        const data = await res.json();

        if (cancelled) return;

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords: [number, number][] = route.geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number],
          );
          setRouteInfo({
            coordinates: coords,
            distanceKm: route.distance / 1000,
            durationMinutes: route.duration / 60,
          });
        } else {
          setRouteError(true);
        }
      } catch {
        if (!cancelled) setRouteError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchRoute();
    return () => {
      cancelled = true;
    };
  }, [srcLat, srcLng, dstLat, dstLng]);

  // Haversine fallback
  const straightLineKm = (() => {
    const R = 6371;
    const dLat = ((dstLat - srcLat) * Math.PI) / 180;
    const dLon = ((dstLng - srcLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((srcLat * Math.PI) / 180) *
        Math.cos((dstLat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  })();

  if (!isClient) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div
          className="rounded-lg bg-muted/50 animate-pulse flex items-center justify-center text-muted-foreground"
          style={{ height: 400 }}
        >
          {t.loadingRoute || "Loading map..."}
        </div>
      </div>
    );
  }

  const sourcePos: [number, number] = [srcLat, srcLng];
  const destPos: [number, number] = [dstLat, dstLng];

  const distanceKm = routeInfo?.distanceKm ?? straightLineKm;
  const durationMin = routeInfo?.durationMinutes ?? null;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" />
        {t.routeMap || "Route Map"}
      </h3>

      {/* Addresses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="flex items-start gap-2">
          <span className="mt-1 inline-block w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t.source || "From"}</p>
            <p className="text-sm font-medium text-foreground leading-tight truncate">{sourceLabel || "-"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1 inline-block w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t.destination || "To"}</p>
            <p className="text-sm font-medium text-foreground leading-tight truncate">{destinationLabel || "-"}</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-primary/5 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Route className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground">
              {t.distance || "Distance"}
            </p>
          </div>
          <p className="text-lg font-bold text-foreground">
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)} m`
              : `${distanceKm.toFixed(1)} ${t.km || "km"}`}
          </p>
          {routeError && (
            <p className="text-[10px] text-muted-foreground">
              {t.straightLineEstimate || "Straight-line estimate"}
            </p>
          )}
        </div>

        {durationMin !== null && (
          <div className="bg-primary/5 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">
                {t.estimatedTime || "Est. Travel Time"}
              </p>
            </div>
            <p className="text-lg font-bold text-foreground">
              {formatDuration(durationMin)}
            </p>
          </div>
        )}

        {isLoading && (
          <div className="bg-primary/5 rounded-lg p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">
              {t.loadingRoute || "Loading route..."}
            </p>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-border">
        <MapContainer
          center={sourcePos}
          zoom={6}
          style={{ height: 400, width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds source={sourcePos} destination={destPos} />

          {/* Actual driving route */}
          {routeInfo && routeInfo.coordinates.length > 0 && (
            <Polyline
              positions={routeInfo.coordinates}
              pathOptions={{
                color: "#2563eb",
                weight: 4,
                opacity: 0.8,
              }}
            />
          )}

          {/* Dashed fallback line when OSRM fails */}
          {routeError && (
            <Polyline
              positions={[sourcePos, destPos]}
              pathOptions={{
                color: "#2563eb",
                weight: 3,
                opacity: 0.5,
                dashArray: "10, 10",
              }}
            />
          )}

          {/* Source pin (green) */}
          <Marker position={sourcePos} icon={sourceIcon}>
            <Popup>
              <strong>{t.source || "Source"}</strong>
              {sourceLabel && <br />}
              {sourceLabel}
            </Popup>
          </Marker>

          {/* Destination pin (red) */}
          <Marker position={destPos} icon={destinationIcon}>
            <Popup>
              <strong>{t.destination || "Destination"}</strong>
              {destinationLabel && <br />}
              {destinationLabel}
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
          {t.source || "Source"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
          {t.destination || "Destination"}
        </span>
      </div>
    </div>
  );
}
