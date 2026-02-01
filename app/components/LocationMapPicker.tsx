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
import { Pencil, Loader2, AlertCircle, RefreshCw, Navigation } from "lucide-react";

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
        // Add cache: 'no-store' to prevent stale data
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

    // Validate we have address data (Nominatim returns { address: { ... } })
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
  /** Called when address data is retrieved from map coordinates */
  onAddressData?: (addressData: AddressData) => void;
  /** Show loading indicator when fetching address */
  showLoadingState?: boolean;
  /** Allow manual retry on error */
  allowRetry?: boolean;
  /** Show "Use my location" button to get current GPS position */
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
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

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
        setRetryCount(0); // Reset retry count on success
      } else {
        setAddressError(result.error || "Failed to fetch address");
        // Still call onAddressData with empty data so form can continue
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

  const handleUseMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }
    setIsGettingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        handlePositionChange(latitude, longitude);
        setIsGettingLocation(false);
      },
      () => {
        setLocationError("Could not get your location");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [handlePositionChange]);

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {editable
              ? "Click on the map to set your location"
              : position
                ? "Your selected location"
                : "No location set"}
          </p>
          {showLoadingState && isLoadingAddress && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {showUseMyLocation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseMyLocation}
              disabled={isGettingLocation}
              className="gap-1.5 shrink-0 cursor-pointer"
            >
              {isGettingLocation ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              Use my location
            </Button>
          )}
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
      </div>

      {locationError && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {locationError}
        </p>
      )}

      {/* Error message with optional retry button */}
      {addressError && (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{addressError}</p>
          </div>
          {allowRetry && !isLoadingAddress && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="h-auto p-1 hover:bg-destructive/20 shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div
        className="rounded-lg overflow-hidden border border-border"
        style={{ height }}
      >
        {isClient ? (
          <MapContainer
            key="leaflet-map"
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
                    handlePositionChange(lat, lng);
                  },
                }}
                draggable={editable}
              />
            )}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50">
            <p className="text-muted-foreground text-sm">Loading map...</p>
          </div>
        )}
      </div>
    </div>
  );
}