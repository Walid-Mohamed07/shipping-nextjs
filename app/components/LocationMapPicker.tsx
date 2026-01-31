"use client";

import { useCallback, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

// Fix Leaflet default icon in Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationMapPickerProps {
  /** Current position (lat, lng) */
  position: { lat: number; lng: number } | null;
  /** Called when position changes (map click in edit mode) */
  onPositionChange: (lat: number, lng: number) => void;
  /** Whether the user can click the map to change location */
  editable?: boolean;
  /** Called when user toggles edit mode */
  onEditableChange?: (editable: boolean) => void;
  /** Compact height for inline display */
  height?: number;
}

function MapClickHandler({
  editable,
  onPositionChange,
}: {
  editable: boolean;
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (editable) {
        onPositionChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapViewUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [map, center]);
  return null;
}

export function LocationMapPicker({
  position,
  onPositionChange,
  editable = false,
  onEditableChange,
  height = 280,
}: LocationMapPickerProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handlePositionChange = useCallback(
    (lat: number, lng: number) => {
      onPositionChange(lat, lng);
    },
    [onPositionChange]
  );

  if (!isClient) {
    return (
      <div
        className="w-full rounded-lg border border-border bg-muted/50 flex items-center justify-center text-muted-foreground"
        style={{ height }}
      >
        Loading map...
      </div>
    );
  }

  // Default center (Cairo) when no position
  const center = position || { lat: 30.0444, lng: 31.2357 };
  const zoom = position ? 14 : 4;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {editable
            ? "Click on the map to set your location"
            : position
              ? "Your selected location"
              : "No location set"}
        </p>
        {onEditableChange && position && (
          <Button
            type="button"
            variant={editable ? "default" : "outline"}
            size="sm"
            onClick={() => onEditableChange(!editable)}
            className="gap-1.5 shrink-0 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            {editable ? "Done" : "Edit on map"}
          </Button>
        )}
      </div>
      <div
        className="rounded-lg overflow-hidden border border-border"
        style={{ height }}
      >
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          className="h-full w-full"
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler
            editable={editable}
            onPositionChange={handlePositionChange}
          />
          {position && (
            <MapViewUpdater center={[position.lat, position.lng]} />
          )}
          {position && (
            <Marker
              position={[position.lat, position.lng]}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const { lat, lng } = marker.getLatLng();
                  onPositionChange(lat, lng);
                },
              }}
              draggable={editable}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
