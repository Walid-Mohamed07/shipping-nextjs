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
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2, AlertCircle, RefreshCw, Navigation, MapPin, Check } from "lucide-react";

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



export interface AddressData {
  street?: string;
  city?: string;
  district?: string;
  governorate?: string;
  country?: string;
  postalCode?: string;
}

interface GeocodingResult {
  success: boolean;
  addressData?: AddressData;
  error?: string;
}

// Reverse geocoding function using local API proxy to avoid CORS issues
async function fetchAddressFromCoordinates(
  lat: number,
  lng: number
): Promise<GeocodingResult> {
  try {
    const response = await fetch(
      `/api/reverse-geocode?lat=${lat}&lon=${lng}`,
      {
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      let errorMessage = "Unknown error";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    if (!data || !data.address) {
      return {
        success: false,
        error: "No address data returned from geocoding service",
      };
    }

    const address = data.address;

    const addressData: AddressData = {
      street: address.road || address.pedestrian || address.street || address.highway || "",
      city: address.city || address.town || address.village || address.municipality || "",
      district: address.suburb || address.neighborhood || address.quarter || address.district || "",
      governorate: address.state || address.province || address.county || address.region || "",
      country: address.country || "",
      postalCode: address.postcode || "",
    };

    return {
      success: true,
      addressData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch address data";
    if (process.env.NODE_ENV === "development") {
      console.warn("Reverse geocode:", message);
    }
    return { success: false, error: message };
  }
}

export interface LocationMapPickerProps {
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
  /** Called with address data when coordinates are reverse-geocoded */
  onAddressData?: (addressData: AddressData) => void;
  /** Show loading state while fetching address */
  showLoadingState?: boolean;
  /** Allow retry on address fetch failure */
  allowRetry?: boolean;
  /** Show "Use My Location" button */
  showUseMyLocation?: boolean;
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
  onAddressData,
  showLoadingState = true,
  allowRetry = true,
  showUseMyLocation = false,
}: LocationMapPickerProps) {
  const [isClient, setIsClient] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch address when position changes
  useEffect(() => {
    let isCancelled = false;

    const fetchAddress = async () => {
      if (!position || !onAddressData) return;

      setIsLoadingAddress(true);
      setAddressError(null);

      const result = await fetchAddressFromCoordinates(
        position.lat,
        position.lng
      );

      if (isCancelled) return;

      setIsLoadingAddress(false);

      if (result.success && result.addressData) {
        onAddressData(result.addressData);
        setRetryCount(0);
      } else {
        setAddressError(result.error || "Failed to fetch address");
        onAddressData({
          street: "",
          city: "",
          district: "",
          governorate: "",
          country: "",
          postalCode: "",
        });
      }
    };

    fetchAddress();

    return () => {
      isCancelled = true;
    };
  }, [position, onAddressData, retryCount]);

  const handlePositionChange = useCallback(
    (lat: number, lng: number) => {
      onPositionChange(lat, lng);
    },
    [onPositionChange]
  );

  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

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

  const center = position || { lat: 30.0444, lng: 31.2357 };
  const zoom = position ? 14 : 4;

  return (
    <div className="space-y-2">
      {/* Simple header */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {editable ? "Click on map to pick location" : position ? "Location set" : "No location"}
          </span>
          {isLoadingAddress && <Loader2 className="w-3 h-3 animate-spin" />}
        </div>
        {onEditableChange && (
          <Button
            type="button"
            variant={editable ? "default" : "outline"}
            size="sm"
            onClick={() => onEditableChange(!editable)}
            className="cursor-pointer"
          >
            {editable ? "Done" : "Edit"}
          </Button>
        )}
      </div>

      {/* Simple error message */}
      {addressError && (
        <div className="flex items-center justify-between gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-2">
          <span>Could not get address. {allowRetry && "Click retry or enter manually."}</span>
          {allowRetry && !isLoadingAddress && (
            <button
              type="button"
              onClick={handleRetry}
              className="text-amber-700 hover:text-amber-900 dark:text-amber-300"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Simple map container */}
      <div className="rounded-lg overflow-hidden border border-border" style={{ height }}>
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoom}
          className="h-full w-full z-0"
          scrollWheelZoom={true}
          zoomControl={true}
          dragging={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler
            editable={editable}
            onPositionChange={handlePositionChange}
          />
          {position && <MapViewUpdater center={[position.lat, position.lng]} />}
          {position && (
            <Marker
              position={[position.lat, position.lng]}
              draggable={editable}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const { lat, lng } = marker.getLatLng();
                  handlePositionChange(lat, lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      
    </div>
  );
}