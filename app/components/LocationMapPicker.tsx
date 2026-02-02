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

// Custom marker icon with better styling
const createCustomIcon = (isActive: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        position: relative;
        width: 40px;
        height: 40px;
        transform: translate(-50%, -50%);
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 32px;
          height: 32px;
          background: ${isActive ? '#3b82f6' : '#ef4444'};
          border-radius: 50% 50% 50% 0;
          transform: translateX(-50%) rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 3px solid white;
          transition: all 0.3s ease;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
        <div style="
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${isActive ? '#3b82f6' : '#ef4444'};
          opacity: 0.3;
        "></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
};

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

interface LocationMapPickerProps {
  position: { lat: number; lng: number } | null;
  onPositionChange: (lat: number, lng: number) => void;
  editable?: boolean;
  onEditableChange?: (editable: boolean) => void;
  height?: number;
  onAddressData?: (addressData: AddressData) => void;
  showLoadingState?: boolean;
  allowRetry?: boolean;
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
    map.setView(center, 14, { animate: true, duration: 0.5 });
  }, [map, center]);
  return null;
}

export function LocationMapPicker({
  position,
  onPositionChange,
  editable = false,
  onEditableChange,
  height = 400,
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
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);

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
        className="w-full rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-muted/30 to-muted/50 flex flex-col items-center justify-center text-muted-foreground gap-3"
        style={{ height }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Initializing map...</p>
      </div>
    );
  }

  const center = position || { lat: 30.0444, lng: 31.2357 };
  const zoom = position ? 14 : 4;

  return (
    <div className="space-y-3">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {editable
                ? "📍 Interactive Mode"
                : position
                  ? "✓ Location Selected"
                  : "⚠ No Location Set"}
            </p>
            <p className="text-xs text-muted-foreground">
              {editable
                ? "Click anywhere on the map or drag the marker to set your location"
                : position
                  ? "Your location has been set successfully"
                  : "Use the button to enable location selection"}
            </p>
            {showLoadingState && isLoadingAddress && (
              <div className="flex items-center gap-2 mt-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Fetching address details...</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {showUseMyLocation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseMyLocation}
              disabled={isGettingLocation}
              className="gap-2 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {isGettingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Use My Location</span>
            </Button>
          )}
          {onEditableChange && position && (
            <Button
              type="button"
              variant={editable ? "default" : "outline"}
              size="sm"
              onClick={() => onEditableChange(!editable)}
              className="gap-2 shadow-sm hover:shadow-md transition-all duration-200"
            >
              {editable ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="hidden sm:inline">Done</span>
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit Location</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Location Error */}
      {locationError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{locationError}</p>
        </div>
      )}

      {/* Address Error with Retry */}
      {addressError && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Address Lookup Failed</p>
              <p className="text-xs mt-1 opacity-90">{addressError}</p>
            </div>
          </div>
          {allowRetry && !isLoadingAddress && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRetry}
              className="h-auto p-2 hover:bg-amber-500/20 shrink-0 transition-colors"
              title="Retry fetching address"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Map Container with Enhanced Styling */}
      <div
        className={`
          rounded-xl overflow-hidden border-2 shadow-lg transition-all duration-300
          ${editable 
            ? 'border-primary shadow-primary/20 ring-2 ring-primary/10' 
            : 'border-border shadow-md'
          }
        `}
        style={{ height }}
      >
        <style jsx global>{`
          .leaflet-container {
            transition: filter 0.3s ease;
          }
          ${editable ? `
            .leaflet-container {
              filter: saturate(1.1) brightness(1.05);
              cursor: pointer !important;
            }
            .leaflet-interactive {
              cursor: pointer !important;
            }
          ` : `
            .leaflet-container {
              cursor: default !important;
            }
          `}
          .custom-marker {
            animation: markerBounce 0.5s ease-out;
          }
          @keyframes markerBounce {
            0% {
              transform: translateY(-100px) scale(0.5);
              opacity: 0;
            }
            50% {
              transform: translateY(10px) scale(1.1);
            }
            100% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
          }
          .leaflet-marker-icon {
            cursor: ${editable ? 'grab' : 'default'} !important;
            transition: transform 0.2s ease;
          }
          .leaflet-marker-icon:active {
            cursor: ${editable ? 'grabbing' : 'default'} !important;
            transform: scale(1.15) !important;
          }
          .leaflet-marker-dragging {
            cursor: grabbing !important;
            transform: scale(1.15) !important;
          }
        `}</style>
        
        {isClient ? (
          <MapContainer
            key="leaflet-map"
            center={[center.lat, center.lng]}
            zoom={zoom}
            className="h-full w-full"
            scrollWheelZoom={true}
            zoomControl={true}
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
                icon={createCustomIcon(editable)}
                eventHandlers={{
                  dragstart: () => setIsDraggingMarker(true),
                  dragend: (e) => {
                    const marker = e.target;
                    const { lat, lng } = marker.getLatLng();
                    handlePositionChange(lat, lng);
                    setIsDraggingMarker(false);
                  },
                }}
                draggable={editable}
              />
            )}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/30 to-muted/50">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground text-sm font-medium">Loading map...</p>
          </div>
        )}
      </div>

      {/* Coordinates Display (Optional - for debugging or info) */}
      {position && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
          <span className="font-mono">
            📍 {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}