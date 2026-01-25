"use client";

import { useEffect, useState } from "react";
import { MapPin, Truck } from "lucide-react";

interface LiveTrackingMapProps {
  from: string;
  to: string;
  isInTransit: boolean;
}

// Dummy coordinates for different countries (center points)
const countryCoordinates: Record<string, { lat: number; lng: number }> = {
  "United States": { lat: 37.0902, lng: -95.7129 },
  Canada: { lat: 56.1304, lng: -106.3468 },
  "United Kingdom": { lat: 55.3781, lng: -3.436 },
  Germany: { lat: 51.165, lng: 10.4515 },
  France: { lat: 46.2276, lng: 2.2137 },
  Spain: { lat: 40.463667, lng: -3.74922 },
  Italy: { lat: 41.8719, lng: 12.5674 },
  Japan: { lat: 36.2048, lng: 138.2529 },
  Australia: { lat: -25.2744, lng: 133.7751 },
  Mexico: { lat: 23.6345, lng: -102.5528 },
};

export function LiveTrackingMap({
  from,
  to,
  isInTransit,
}: LiveTrackingMapProps) {
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [progress, setProgress] = useState(0);

  // Remove startCoords and endCoords from top-level scope to avoid new objects on every render

  // Simulate package movement
  useEffect(() => {
    const startCoords = countryCoordinates[from] || {
      lat: 37.0902,
      lng: -95.7129,
    };
    const endCoords = countryCoordinates[to] || { lat: 51.5074, lng: -0.1278 };

    if (!isInTransit) {
      setCurrentPosition(endCoords);
      setProgress(100);
      return;
    }

    setCurrentPosition(startCoords);
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 2 + 0.5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
      }
      setProgress(currentProgress);

      // Interpolate position
      const lat =
        startCoords.lat +
        (endCoords.lat - startCoords.lat) * (currentProgress / 100);
      const lng =
        startCoords.lng +
        (endCoords.lng - startCoords.lng) * (currentProgress / 100);
      setCurrentPosition({ lat, lng });
    }, 1000);

    return () => clearInterval(interval);
  }, [isInTransit, from, to]);

  // Calculate viewport bounds
  // Recalculate startCoords and endCoords for rendering
  const startCoords = countryCoordinates[from] || {
    lat: 37.0902,
    lng: -95.7129,
  };
  const endCoords = countryCoordinates[to] || { lat: 51.5074, lng: -0.1278 };

  const minLat = Math.min(startCoords.lat, endCoords.lat) - 5;
  const maxLat = Math.max(startCoords.lat, endCoords.lat) + 5;
  const minLng = Math.min(startCoords.lng, endCoords.lng) - 5;
  const maxLng = Math.max(startCoords.lng, endCoords.lng) + 5;

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  // Convert lat/lng to SVG coordinates
  const latToY = (lat: number) => ((maxLat - lat) / latRange) * 400;
  const lngToX = (lng: number) => ((lng - minLng) / lngRange) * 600;

  const startX = lngToX(startCoords.lng);
  const startY = latToY(startCoords.lat);
  const endX = lngToX(endCoords.lng);
  const endY = latToY(endCoords.lat);
  const currentX = currentPosition ? lngToX(currentPosition.lng) : startX;
  const currentY = currentPosition ? latToY(currentPosition.lat) : startY;

  return (
    <div className="bg-card rounded-lg border border-border p-6 w-full">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-2">
          <Truck className="w-5 h-5 text-primary" />
          Live Package Tracking
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Package is {isInTransit ? "in transit" : "at destination"} •{" "}
          {Math.round(progress)}% complete
        </p>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="relative bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden">
        <svg width="100%" height="400" viewBox="0 0 600 400" className="w-full">
          {/* Gradient defs */}
          <defs>
            <linearGradient
              id="routeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor="hsl(var(--primary))"
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor="hsl(var(--primary))"
                stopOpacity="0.1"
              />
            </linearGradient>
          </defs>

          {/* Route line */}
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />

          {/* Progress line */}
          {isInTransit && (
            <line
              x1={startX}
              y1={startY}
              x2={currentX}
              y2={currentY}
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              opacity="0.9"
            />
          )}

          {/* Start marker */}
          <circle
            cx={startX}
            cy={startY}
            r="8"
            fill="hsl(var(--primary))"
            opacity="0.3"
          />
          <circle cx={startX} cy={startY} r="5" fill="hsl(var(--primary))" />
          <text
            x={startX}
            y={startY - 15}
            textAnchor="middle"
            className="text-xs font-medium"
            fill="hsl(var(--foreground))"
          >
            {from}
          </text>

          {/* End marker */}
          <circle
            cx={endX}
            cy={endY}
            r="8"
            fill="hsl(var(--accent))"
            opacity="0.3"
          />
          <circle cx={endX} cy={endY} r="5" fill="hsl(var(--accent))" />
          <text
            x={endX}
            y={endY + 20}
            textAnchor="middle"
            className="text-xs font-medium"
            fill="hsl(var(--foreground))"
          >
            {to}
          </text>

          {/* Current position marker (animated truck) */}
          {isInTransit && currentPosition && (
            <>
              <circle
                cx={currentX}
                cy={currentY}
                r="12"
                fill="hsl(var(--primary))"
                opacity="0.2"
                className="animate-pulse"
              />
              <g transform={`translate(${currentX}, ${currentY})`}>
                <rect
                  x="-6"
                  y="-6"
                  width="12"
                  height="12"
                  fill="hsl(var(--primary))"
                  rx="2"
                  className="animate-bounce"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="8"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  opacity="0.3"
                />
              </g>
            </>
          )}

          {/* Destination marker (when delivered) */}
          {!isInTransit && (
            <>
              <circle
                cx={endX}
                cy={endY}
                r="15"
                fill="hsl(var(--accent))"
                opacity="0.2"
                className="animate-pulse"
              />
              <g transform={`translate(${endX}, ${endY})`}>
                <circle cx="0" cy="0" r="6" fill="hsl(var(--accent))" />
              </g>
            </>
          )}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Origin</p>
          <p className="font-medium text-foreground">{from}</p>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Destination</p>
          <p className="font-medium text-foreground">{to}</p>
        </div>
      </div>
    </div>
  );
}
