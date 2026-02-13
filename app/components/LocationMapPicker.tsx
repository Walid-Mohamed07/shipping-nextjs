"use client";

/**
 * LocationMapPicker Component
 * 
 * A comprehensive Leaflet-based map picker with the following features:
 * 
 * ✅ Click on map to select location
 * ✅ Single marker placement (no duplicates)
 * ✅ Draggable marker (when editable=true)
 * ✅ Auto-popup showing resolved address on marker
 * ✅ OpenStreetMap Nominatim Reverse Geocoding (free API)
 * ✅ Extracts: street, city, state/region, postal code, country
 * ✅ Debounced API requests (800ms) to prevent rapid calls
 * ✅ Loading and error states with retry functionality
 * ✅ Search by place name with autocomplete
 * ✅ "Use my location" button for GPS positioning
 * ✅ Clean event handling and proper Leaflet cleanup
 * ✅ Fully compatible with React/Next.js
 * 
 * Usage:
 * ```tsx
 * <LocationMapPicker
 *   position={{ lat: 30.0444, lng: 31.2357 }}
 *   onPositionChange={(lat, lng) => setCoords({ lat, lng })}
 *   onAddressData={(address) => setAddress(address)}
 *   editable={true}
 *   showUseMyLocation={true}
 * />
 * ```
 */

import { useCallback, useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Loader2, AlertCircle, RefreshCw, Navigation, MapPin, Check, Search, X } from "lucide-react";

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

// Forward geocoding function - search for places by name
async function searchPlaceByName(query: string): Promise<{ lat: number; lng: number; displayName: string }[]> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      {
        headers: {
          'User-Agent': 'ShipHub-App',
        },
      }
    );
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    return data.map((item: any) => ({
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      displayName: item.display_name,
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
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
      if (editable && e && e.latlng) {
        try {
          if (typeof e.latlng.lat === 'number' && typeof e.latlng.lng === 'number') {
            onPositionChange(e.latlng.lat, e.latlng.lng);
          }
        } catch (error) {
          console.error("Error handling map click:", error);
        }
      }
    },
  });
  return null;
}

function MapViewUpdater({ center, shouldCenter }: { center: [number, number]; shouldCenter: boolean }) {
  const map = useMap();
  const hasCentered = useRef(false);
  
  useEffect(() => {
    try {
      // Only center once when shouldCenter is true, not continuously
      if (!shouldCenter || hasCentered.current) {
        return;
      }
      
      if (!map || !center || !Array.isArray(center) || center.length !== 2) {
        return;
      }
      
      // Verify center has valid numbers
      if (typeof center[0] !== 'number' || typeof center[1] !== 'number') {
        return;
      }

      const container = map.getContainer && map.getContainer();
      if (!container || !container.offsetHeight || !container.offsetWidth) {
        return;
      }

      // Create a minimal delay to let Leaflet fully initialize
      const timeoutId = setTimeout(() => {
        try {
          if (map && map.setView && typeof map.setView === 'function') {
            map.setView([center[0], center[1]], 14);
            hasCentered.current = true;
            
            // Force map to recalculate after setting view
            if (map.invalidateSize && typeof map.invalidateSize === 'function') {
              setTimeout(() => {
                try {
                  map.invalidateSize();
                } catch (e) {
                  // silently ignore
                }
              }, 100);
            }
          }
        } catch (error) {
          console.error("Error setting map view:", error);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error("Error in MapViewUpdater:", error);
    }
  }, [map, center, shouldCenter]);
  
  // Reset hasCentered when center changes significantly
  useEffect(() => {
    hasCentered.current = false;
  }, [center[0], center[1]]);
  
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ lat: number; lng: number; displayName: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [shouldCenterMap, setShouldCenterMap] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reverseGeocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store resolved address for popup display
  const [resolvedAddress, setResolvedAddress] = useState<AddressData | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Cleanup all timeouts on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (reverseGeocodeTimeoutRef.current) {
        clearTimeout(reverseGeocodeTimeoutRef.current);
      }
    };
  }, []);

  // Debounced fetch address when position changes (prevents rapid API calls)
  useEffect(() => {
    let isCancelled = false;

    // Clear any pending reverse geocode requests
    if (reverseGeocodeTimeoutRef.current) {
      clearTimeout(reverseGeocodeTimeoutRef.current);
    }

    if (!position || !onAddressData) {
      setResolvedAddress(null);
      return;
    }

    setIsLoadingAddress(true);
    setAddressError(null);

    // Debounce the reverse geocoding API call by 800ms
    reverseGeocodeTimeoutRef.current = setTimeout(async () => {
      const result = await fetchAddressFromCoordinates(
        position.lat,
        position.lng
      );

      if (isCancelled) return;

      setIsLoadingAddress(false);

      if (result.success && result.addressData) {
        setResolvedAddress(result.addressData);
        onAddressData(result.addressData);
        setRetryCount(0);
      } else {
        setAddressError(result.error || "Failed to fetch address");
        const emptyAddress = {
          street: "",
          city: "",
          district: "",
          governorate: "",
          country: "",
          postalCode: "",
        };
        setResolvedAddress(emptyAddress);
        onAddressData(emptyAddress);
      }
    }, 800); // 800ms debounce

    return () => {
      isCancelled = true;
      if (reverseGeocodeTimeoutRef.current) {
        clearTimeout(reverseGeocodeTimeoutRef.current);
      }
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

  // Handle search input changes with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (value.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchPlaceByName(value);
      setSearchResults(results);
      setIsSearching(false);
    }, 500);
  }, []);

  // Handle selecting a search result
  const handleSelectSearchResult = useCallback((result: { lat: number; lng: number; displayName: string }) => {
    onPositionChange(result.lat, result.lng);
    setSearchQuery("");
    setSearchResults([]);
    setShouldCenterMap(true);
  }, [onPositionChange]);

  // Handle clearing the location
  const handleClearLocation = useCallback(() => {
    // Pass null coordinates to signal clearing (parent should handle this)
    onPositionChange(0, 0); // Marker will be hidden due to the 0,0 check
    setSearchQuery("");
    setSearchResults([]);
    setShouldCenterMap(false);
    setResolvedAddress(null);
    setAddressError(null);
  }, [onPositionChange]);

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
      {/* Search bar */}
      {editable && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for a place or address..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
            )}
          </div>
          
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(result)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b border-border last:border-b-0 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground line-clamp-2">{result.displayName}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Simple header */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {editable ? "Click on map to pick location" : position ? "Location set" : "No location"}
          </span>
          {isLoadingAddress && <Loader2 className="w-3 h-3 animate-spin" />}
        </div>
        <div className="flex items-center gap-1">
          {position && position.lat !== 0 && position.lng !== 0 && editable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearLocation}
              className="cursor-pointer text-destructive hover:text-destructive"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
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
        {isClient ? (
          <div style={{ height: "100%", width: "100%" }} className="relative">
            <MapContainer
              key={`map-${height}`}
              center={[center.lat, center.lng]}
              zoom={zoom}
              className="h-full w-full z-0"
              scrollWheelZoom={true}
              zoomControl={true}
              dragging={true}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler
                editable={editable}
                onPositionChange={handlePositionChange}
              />
              {position && position.lat !== 0 && position.lng !== 0 && (
                <MapViewUpdater center={[position.lat, position.lng]} shouldCenter={shouldCenterMap} />
              )}
              {position && position.lat !== 0 && position.lng !== 0 && (
                <Marker
                  key={`marker-${position.lat}-${position.lng}`}
                  position={[position.lat, position.lng]}
                  draggable={editable}
                  eventHandlers={
                    editable ? {
                      dragend: (e) => {
                        try {
                          const marker = e.target;
                          if (marker && marker.getLatLng && typeof marker.getLatLng === 'function') {
                            const latlng = marker.getLatLng();
                            if (latlng && typeof latlng.lat === 'number' && typeof latlng.lng === 'number') {
                              handlePositionChange(latlng.lat, latlng.lng);
                              setShouldCenterMap(false); // Don't recenter after drag
                            }
                          }
                        } catch (error) {
                          console.error("Error handling marker drag:", error);
                        }
                      },
                    } : {}
                  }
                >
                  {/* Popup showing resolved address */}
                  <Popup>
                    <div className="text-sm space-y-1 min-w-[200px]">
                      <div className="font-semibold text-foreground border-b pb-1 mb-2">
                        📍 Selected Location
                      </div>
                      
                      {isLoadingAddress ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Fetching address...</span>
                        </div>
                      ) : addressError ? (
                        <div className="text-amber-600 text-xs">
                          <AlertCircle className="w-3 h-3 inline mr-1" />
                          {addressError}
                        </div>
                      ) : resolvedAddress ? (
                        <div className="space-y-1">
                          {resolvedAddress.street && (
                            <div className="text-foreground">
                              <span className="font-medium">Street:</span> {resolvedAddress.street}
                            </div>
                          )}
                          {resolvedAddress.city && (
                            <div className="text-foreground">
                              <span className="font-medium">City:</span> {resolvedAddress.city}
                            </div>
                          )}
                          {resolvedAddress.governorate && (
                            <div className="text-foreground">
                              <span className="font-medium">State:</span> {resolvedAddress.governorate}
                            </div>
                          )}
                          {resolvedAddress.postalCode && (
                            <div className="text-foreground">
                              <span className="font-medium">Postal:</span> {resolvedAddress.postalCode}
                            </div>
                          )}
                          {resolvedAddress.country && (
                            <div className="text-foreground font-medium">
                              {resolvedAddress.country}
                            </div>
                          )}
                          {!resolvedAddress.street && !resolvedAddress.city && !resolvedAddress.country && (
                            <div className="text-muted-foreground text-xs italic">
                              No address data available
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-xs">
                          Click to see details
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
                        {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                      </div>
                      
                      {editable && (
                        <div className="text-xs text-muted-foreground italic pt-1">
                          💡 Drag marker to adjust
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/50 text-muted-foreground">
            Loading map...
          </div>
        )}
      </div>

      
    </div>
  );
}