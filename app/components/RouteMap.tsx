"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";

// Route colors: primary blue for line, blue = customer, red = warehouse
const ROUTE_LINE_COLOR = "#2563eb"; // primary blue
const CUSTOMER_PIN_COLOR = "#2563eb"; // blue – source & destination
const WAREHOUSE_PIN_COLOR = "#dc2626"; // red – source & dest warehouse

function createPinIcon(color: string, label: string): L.DivIcon {
  const size = 28;
  const html = `
    <div style="
      width: ${size}px; height: ${size}px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        color: white;
        font-size: 10px;
        font-weight: 700;
        text-shadow: 0 0 1px #000;
      " title="${label}">${label.charAt(0)}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "route-map-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

export interface RoutePoint {
  lat: number;
  lng: number;
  label?: string;
}

interface RouteMapProps {
  source: RoutePoint | null;
  sourceWarehouse: RoutePoint | null;
  destWarehouse: RoutePoint | null;
  destination: RoutePoint | null;
  height?: number;
}

function MapBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (points.length < 2) return;
    
    try {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    } catch (error) {
      console.error("Error fitting map bounds:", error);
    }
  }, [map, points]);
  
  return null;
}

export function RouteMap({
  source,
  sourceWarehouse,
  destWarehouse,
  destination,
  height = 320,
}: RouteMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const customerIcon = useMemo(
    () => (typeof L !== "undefined" ? createPinIcon(CUSTOMER_PIN_COLOR, "Customer") : null),
    []
  );
  const warehouseIcon = useMemo(
    () => (typeof L !== "undefined" ? createPinIcon(WAREHOUSE_PIN_COLOR, "Warehouse") : null),
    []
  );

  if (!isClient) {
    return (
      <div
        className="rounded-lg border border-border bg-muted/50 animate-pulse flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        Loading map...
      </div>
    );
  }

  // Filter out null points and create the route
  const allPoints = [source, sourceWarehouse, destWarehouse, destination].filter(
    (point): point is RoutePoint => point !== null
  );

  const hasRoute = allPoints.length >= 2;

  // Create route segments: Source → Source WH → Dest WH → Destination
  const segments: [number, number][][] = [];
  if (source && sourceWarehouse) {
    segments.push([
      [source.lat, source.lng],
      [sourceWarehouse.lat, sourceWarehouse.lng],
    ]);
  }
  if (sourceWarehouse && destWarehouse) {
    segments.push([
      [sourceWarehouse.lat, sourceWarehouse.lng],
      [destWarehouse.lat, destWarehouse.lng],
    ]);
  }
  if (destWarehouse && destination) {
    segments.push([
      [destWarehouse.lat, destWarehouse.lng],
      [destination.lat, destination.lng],
    ]);
  }

  const boundsPoints = allPoints.map((p) => [p.lat, p.lng] as [number, number]);

  const center =
    allPoints.length > 0
      ? allPoints[Math.floor(allPoints.length / 2)]
      : { lat: 30.0444, lng: 31.2357 };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {hasRoute
            ? "Source → Source Warehouse → Destination Warehouse → Destination"
            : "Set locations to view route"}
        </p>
        {hasRoute && customerIcon && warehouseIcon && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full border border-white shadow"
                style={{ background: CUSTOMER_PIN_COLOR }}
              />
              Customer (source & destination)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full border border-white shadow"
                style={{ background: WAREHOUSE_PIN_COLOR }}
              />
              Warehouse
            </span>
          </div>
        )}
      </div>
      <div
        className="rounded-lg overflow-hidden border border-border shadow-sm"
        style={{ height }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={6}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {boundsPoints.length >= 2 && <MapBounds points={boundsPoints} />}

          {/* Draw route line (primary blue) */}
          {segments.map((seg, i) => (
            <Polyline
              key={i}
              positions={seg}
              pathOptions={{
                color: ROUTE_LINE_COLOR,
                weight: 4,
                opacity: 0.9,
              }}
            />
          ))}

          {/* Customer pins (blue): source & destination */}
          {source && customerIcon && (
            <Marker
              position={[source.lat, source.lng]}
              icon={customerIcon}
              title="Source (Customer)"
            />
          )}
          {sourceWarehouse && warehouseIcon && (
            <Marker
              position={[sourceWarehouse.lat, sourceWarehouse.lng]}
              icon={warehouseIcon}
              title="Source Warehouse"
            />
          )}
          {destWarehouse && warehouseIcon && (
            <Marker
              position={[destWarehouse.lat, destWarehouse.lng]}
              icon={warehouseIcon}
              title="Destination Warehouse"
            />
          )}
          {destination && customerIcon && (
            <Marker
              position={[destination.lat, destination.lng]}
              icon={customerIcon}
              title="Destination (Customer)"
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}