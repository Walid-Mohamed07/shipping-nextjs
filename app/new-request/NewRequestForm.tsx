"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import AddAddressDialog from "./AddAddressDialog";
import { useRouter } from "next/navigation";

const LocationMapPicker = dynamic(
  () =>
    import("@/app/components/LocationMapPicker").then((m) => m.LocationMapPicker),
  { ssr: false, loading: () => <div className="h-[280px] rounded-lg border border-border bg-muted/50 animate-pulse" /> }
);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/app/context/AuthContext";
import {
  AlertCircle,
  CheckCircle,
  MapPinned,
  Navigation,
  Package,
  Plus,
  Trash2,
  Warehouse,
} from "lucide-react";
import { countries } from "@/constants/countries";
import { categories } from "@/constants/categories";
import { Warehouse as WarehouseType } from "@/types";
import { getDistanceKm } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const NEARBY_RADIUS_KM = 50;

export default function NewRequestForm() {
  // Warehouses state
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [pickupMode, setPickupMode] = useState("Self");

  // Location / nearby warehouses state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapEditable, setMapEditable] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [nearbyWarehouses, setNearbyWarehouses] = useState<
    (WarehouseType & { distanceKm: number })[]
  >([]);
  const [locationChecked, setLocationChecked] = useState(false);
  const [outOfZone, setOutOfZone] = useState(false);

  // Fetch warehouses on mount
  useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((data) => setWarehouses(data.warehouses || []));
  }, []);

  const fetchNearbyWarehouses = async (lat: number, lng: number) => {
    try {
      const res = await fetch("/api/warehouses");
      const data = await res.json();
      const all: WarehouseType[] = data.warehouses || [];
      const withCoords = all.filter(
        (w) =>
          w.latitude != null && w.longitude != null && w.status === "active"
      );
      const withDistance = withCoords
        .map((w) => ({
          ...w,
          distanceKm: getDistanceKm(lat, lng, w.latitude!, w.longitude!),
        }))
        .filter((w) => w.distanceKm <= NEARBY_RADIUS_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      setNearbyWarehouses(withDistance);
      setOutOfZone(withDistance.length === 0);
    } catch {
      setLocationError("Failed to load warehouses.");
    }
  };

  const handlePositionChange = (lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    setLocationError("");
    fetchNearbyWarehouses(lat, lng);
  };

  const findNearbyWarehouses = () => setShowLocationPrompt(true);

  const handleLocationConfirm = () => {
    setShowLocationPrompt(false);
    setLocationError("");
    setLocationLoading(true);
    setLocationChecked(true);
    setOutOfZone(false);

    if (!navigator.geolocation) {
      setLocationError("Location is not supported by your browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        try {
          await fetchNearbyWarehouses(lat, lng);
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Location permission was denied."
            : "Could not get your location. Please try again."
        );
        setLocationLoading(false);
      }
    );
  };

  const handleLocationDecline = () => setShowLocationPrompt(false);

  const { user } = useAuth();
  // State for showing the select address dialog
  const [showSelectAddress, setShowSelectAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    country: "",
    countryCode: "",
    fullName: "",
    mobile: "",
    street: "",
    building: "",
    city: "",
    district: "",
    governorate: "",
    postalCode: "",
    landmark: "",
    addressType: "Home",
    deliveryInstructions: "",
    primary: false,
  });
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressIdx, setEditAddressIdx] = useState<number | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [sourceType, setSourceType] = useState("my");
  const [destType, setDestType] = useState("other");
  // Get user's locations (addresses)
  const [userLocations, setUserLocations] = useState(user?.locations || []);
  // Fetch latest locations from API
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/user/addresses?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.locations)) setUserLocations(data.locations);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const primaryLocation =
    userLocations.find((loc: { primary?: boolean }) => loc.primary) || userLocations[0] || {};

  // Source address state
  const [fromAddressIdx, setFromAddressIdx] = useState(0); // index in userLocations
  const [from, setFrom] = useState(primaryLocation.country || "");
  const [fromAddress, setFromAddress] = useState(primaryLocation.street || "");
  const [fromPostalCode, setFromPostalCode] = useState(
    primaryLocation.postalCode || "",
  );

  // Use nearby warehouses if available, else filter by source country
  const filteredWarehouses = useMemo(() => {
    if (locationChecked && nearbyWarehouses.length > 0) {
      return nearbyWarehouses;
    }
    return warehouses.filter((w) => w.country === from);
  }, [warehouses, from, locationChecked, nearbyWarehouses]);

  // Clear selected warehouse if it's no longer in the filtered list
  useEffect(() => {
    if (
      selectedWarehouse &&
      !filteredWarehouses.some((w) => w.id === selectedWarehouse)
    ) {
      setSelectedWarehouse("");
    }
  }, [filteredWarehouses, selectedWarehouse]);

  // Destination address state
  const [toAddressIdx, setToAddressIdx] = useState(-1); // -1 means not using saved address
  const [to, setTo] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toPostalCode, setToPostalCode] = useState("");

  // Modal state for adding/editing address
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addAddressType, setAddAddressType] = useState<
    "source" | "destination"
  >("source");
  const [items, setItems] = useState([
    { item: "", category: "", dimensions: "", weight: "", quantity: 1 },
  ]);
  // For new item input fields
  const [newItem, setNewItem] = useState({
    item: "",
    category: "",
    dimensions: "",
    weight: "",
    quantity: 1,
  });
  // Mobile is now per address location, so default to primary location's mobile
  const [mobile, setMobile] = useState(primaryLocation.mobile || "");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const calculateCost = (
    category: string,
    weight: string,
    quantity: number,
    from: string,
    to: string,
  ) => {
    const baseRates = {
      Electronics: 20,
      Clothing: 10,
      Books: 8,
      Furniture: 30,
      "Food & Beverages": 12,
      Cosmetics: 15,
      Jewelry: 25,
      Documents: 5,
      Other: 10,
    };
    const base = baseRates[category as keyof typeof baseRates] || 10;
    const weightNum = parseFloat(weight) || 1;
    const distanceMultiplier = from === to ? 1 : 1.5;
    return (base * weightNum * quantity * distanceMultiplier).toFixed(2);
  };

  const calculateDeliveryTime = (
    from: string,
    to: string,
    category: string,
  ) => {
    if (!from || !to) return "";
    let min = from === to ? 2 : 5;
    let max = from === to ? 3 : 10;
    if (category === "Documents") {
      min -= 1;
      max -= 1;
    } else if (category === "Furniture") {
      min += 2;
      max += 3;
    }
    if (min < 1) min = 1;
    return `${min}-${max} days`;
  };

  React.useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current as any);
    }
    debounceTimeout.current = setTimeout(() => {
      const firstItem = items[0] || { category: "", weight: "", quantity: 1 };
      if (from && to && firstItem.category && firstItem.weight && firstItem.quantity) {
        setEstimatedCost(calculateCost(firstItem.category, firstItem.weight, firstItem.quantity, from, to));
        setEstimatedTime(calculateDeliveryTime(from, to, firstItem.category));
      } else {
        setEstimatedCost("");
        setEstimatedTime("");
      }
    }, 250);
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current as any);
      }
    };
  }, [from, to, items]);

  const countryOptions = useMemo(
    () =>
      countries.map((country) => (
        <SelectItem key={country} value={country}>
          {country}
        </SelectItem>
      )),
    [],
  );
  const categoryOptions = useMemo(
    () =>
      categories.map((cat) => (
        <SelectItem key={cat} value={cat}>
          {cat}
        </SelectItem>
      )),
    [],
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    // Use selected location for 'my' address, otherwise use manual input
    const selectedSourceLoc = userLocations[fromAddressIdx] || {};
    const selectedDestLoc = userLocations[toAddressIdx] || {};
    // Build source and destination objects
    const source: any = sourceType === "my" ? selectedSourceLoc : {
      ...addressForm,
      warehouseId: selectedWarehouse,
      pickupMode,
    };
    const destination: any = destType === "my" ? selectedDestLoc : {
      ...addressForm,
      warehouseId: selectedWarehouse,
      pickupMode,
    };
    // Validation
    if (!source || !destination || items.length === 0 || !estimatedCost || !estimatedTime) {
      setError("Please fill in all fields and add at least one item");
      return;
    }
    setIsLoading(true);
    try {
      const requestBody = {
        userId: user?.id,
        source,
        destination,
        items,
        estimatedCost,
        estimatedTime,
        orderStatus: "Pending",
        deliveryStatus: "Pending",
      };
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create request");
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/my-requests");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              Please log in to create a shipping request.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg border border-border p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Create Shipping Request
            </h1>
            <p className="text-muted-foreground mb-8">
              Fill in the details below to request a shipment
            </p>
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Request created successfully!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    Redirecting to My Requests...
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ——— Section 1: Check Service Availability (Location) ——— */}
              <section className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPinned className="w-5 h-5 text-primary" />
                  Check Service Availability
                </h2>
                <p className="text-sm text-muted-foreground">
                  Share your location to find warehouses within{" "}
                  {NEARBY_RADIUS_KM} km. Your location is never stored.
                </p>

                {!locationChecked && !showMapPicker && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={findNearbyWarehouses}
                      className="gap-2 cursor-pointer"
                    >
                      <Navigation className="w-4 h-4" />
                      Use my location
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowMapPicker(true);
                        setLocationChecked(true);
                        setLocationError("");
                        setMapEditable(true);
                      }}
                      className="gap-2 cursor-pointer"
                    >
                      <MapPinned className="w-4 h-4" />
                      Pick on map
                    </Button>
                  </div>
                )}

                {locationLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Getting your location...
                  </div>
                )}

                {locationError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {locationError}
                  </div>
                )}

                {locationChecked && !locationLoading && !locationError && (
                  <div className="space-y-4">
                    {/* Map - show when we have location OR user is picking on map */}
                    {(userLocation || showMapPicker) && (
                      <LocationMapPicker
                        position={userLocation}
                        onPositionChange={(lat, lng) => {
                          handlePositionChange(lat, lng);
                          setShowMapPicker(false);
                        }}
                        editable={mapEditable}
                        onEditableChange={setMapEditable}
                        height={280}
                      />
                    )}
                    {nearbyWarehouses.length > 0 ? (
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        {nearbyWarehouses.length} warehouse
                        {nearbyWarehouses.length !== 1 ? "s" : ""} within{" "}
                        {NEARBY_RADIUS_KM} km — select below
                      </p>
                    ) : outOfZone ? (
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <MapPinned className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">
                            You&apos;re outside our service zone
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400/90">
                            No warehouses within {NEARBY_RADIUS_KM} km. You can
                            still proceed by selecting a source country below.
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={findNearbyWarehouses}
                        className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Navigation className="w-4 h-4" />
                        Use my location
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowMapPicker(true);
                          setMapEditable(true);
                        }}
                        className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <MapPinned className="w-4 h-4" />
                        Pick on map
                      </Button>
                    </div>
                  </div>
                )}
              </section>

              {/* ——— Section 2: Source (Origin) ——— */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Source (Origin)
                </h2>
                <label className="block text-sm font-medium text-muted-foreground">
                  Pick where your shipment will be collected from
                </label>
                <div role="radiogroup" className="space-y-2">
                  {userLocations.map((loc, idx) => (
                    <label
                      key={idx}
                      className="flex items-start gap-2 cursor-pointer border rounded p-2 hover:bg-chart-1 hover:text-accent-foreground transition-all duration-300"
                    >
                      <input
                        type="radio"
                        name="sourceAddress"
                        value={idx}
                        checked={fromAddressIdx === idx}
                        onChange={() => {
                          setFromAddressIdx(idx);
                          setSourceType("my");
                          setFrom(userLocations[idx]?.country || "");
                          setFromAddress(userLocations[idx]?.street || "");
                          setFromPostalCode(
                            userLocations[idx]?.postalCode || "",
                          );
                        }}
                        disabled={isLoading}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">{loc.fullName}</span> -{" "}
                        {loc.street}, {loc.city} ({loc.country})<br />
                        {loc.postalCode} - {loc.mobile} - {loc.addressType}
                        <br />
                        {loc.landmark && (
                          <>
                            <span className="text-xs">
                              Landmark: {loc.landmark}
                            </span>
                            <br />
                          </>
                        )}
                        {loc.deliveryInstructions && (
                          <>
                            <span className="text-xs">
                              Instructions: {loc.deliveryInstructions}
                            </span>
                            <br />
                          </>
                        )}
                        {loc.building && (
                          <>
                            <span className="text-xs">
                              Building: {loc.building}
                            </span>
                            <br />
                          </>
                        )}
                        {loc.primary && (
                          <span className="text-xs">(Primary Address)</span>
                        )}
                      </span>
                    </label>
                  ))}
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAddAddressType("source");
                        setShowAddAddress(true);
                      }}
                      disabled={isLoading}
                      className="w-full cursor-pointer"
                    >
                      + Add new address
                    </Button>
                  </div>
                </div>
              </section>

              {/* ——— Section 3: Destination ——— */}
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Destination
                </h2>
                <label className="block text-sm font-medium text-muted-foreground">
                  Where should your shipment be delivered?
                </label>
                <div role="radiogroup" className="space-y-2">
                  {userLocations.map((loc, idx) => (
                    <label
                      key={idx}
                      className="flex items-start gap-2 cursor-pointer border rounded p-2 hover:bg-chart-1 hover:text-accent-foreground transition-all duration-300"
                    >
                      <input
                        type="radio"
                        name="destinationAddress"
                        value={idx}
                        checked={toAddressIdx === idx}
                        onChange={() => {
                          setToAddressIdx(idx);
                          setDestType("my");
                          setTo(userLocations[idx]?.country || "");
                          setToAddress(userLocations[idx]?.street || "");
                          setToPostalCode(userLocations[idx]?.postalCode || "");
                        }}
                        disabled={isLoading}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">{loc.fullName}</span> -{" "}
                        {loc.street}, {loc.city} ({loc.country})<br />
                        {loc.postalCode} - {loc.mobile} - {loc.addressType}
                        <br />
                        {loc.landmark && (
                          <>
                            <span className="text-xs">
                              Landmark: {loc.landmark}
                            </span>
                            <br />
                          </>
                        )}
                        {loc.deliveryInstructions && (
                          <>
                            <span className="text-xs">
                              Instructions: {loc.deliveryInstructions}
                            </span>
                            <br />
                          </>
                        )}
                        {loc.building && (
                          <>
                            <span className="text-xs">
                              Building: {loc.building}
                            </span>
                            <br />
                          </>
                        )}
                        {loc.primary && (
                          <span className="text-xs">(Primary Address)</span>
                        )}
                      </span>
                    </label>
                  ))}
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAddAddressType("destination");
                        setShowAddAddress(true);
                      }}
                      disabled={isLoading}
                      className="w-full cursor-pointer"
                    >
                      + Add new address
                    </Button>
                  </div>
                </div>
              </section>

              {/* ——— Section 4: Pickup & Warehouse ——— */}
              <section className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-primary" />
                  Pickup & Warehouse
                </h2>
                {/* Pickup Mode */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Pickup Mode
                  </label>
                  <select
                    className="block w-full rounded border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={pickupMode}
                    onChange={(e) => setPickupMode(e.target.value)}
                    disabled={isLoading}
                    required
                  >
                    <option value="Self">Self</option>
                    <option value="Delegate">Delegate</option>
                  </select>
                </div>
                {/* Available Warehouses */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Available Warehouses
                  </label>
                  <select
                    className="block w-full rounded border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    disabled={isLoading || filteredWarehouses.length === 0}
                    required
                  >
                    <option value="" disabled>
                      {filteredWarehouses.length === 0
                        ? from
                          ? "No warehouses in this country"
                          : "Select source first or find warehouses near you"
                        : "Select a warehouse"}
                    </option>
                    {filteredWarehouses.map((w) => (
                      <option
                        key={w.id}
                        value={w.id}
                        className="bg-background text-foreground"
                      >
                        {w.name || w.id} ({w.state || w.country})
                        {"distanceKm" in w
                          ? ` — ${(w as { distanceKm: number }).distanceKm.toFixed(1)} km`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {/* ——— Section 5: Contact ——— */}
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  Contact
                </h2>
                <div>
                  <label
                    htmlFor="mobile"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Mobile Number
                  </label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Your mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={isLoading}
                  required
                  style={{ maxWidth: "100%" }}
                />
                </div>
              </section>

              {/* ——— Section 6: Items ——— */}
              <section className="space-y-4 rounded-lg border border-border p-5 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      Shipment Items
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {items.length === 0
                        ? "Add at least one item to continue"
                        : `${items.length} item${items.length !== 1 ? "s" : ""} added`}
                    </p>
                  </div>
                </div>

                {/* Item list */}
                {items.length > 0 && (
                  <div className="space-y-2">
                    {items.map((itm, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {itm.item}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-normal"
                            >
                              {itm.category}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {itm.dimensions}
                            <span className="mx-1.5">·</span>
                            {itm.weight} kg
                            <span className="mx-1.5">·</span>
                            ×{itm.quantity}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setItems(items.filter((_, i) => i !== idx))
                          }
                          disabled={isLoading}
                          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground opacity-60 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100 group-hover:opacity-100 cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add item form */}
                <Card className="border-dashed">
                  <CardContent className="p-4 space-y-4">
                    <p className="text-sm font-medium text-foreground">
                      Add new item
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Item description
                        </label>
                        <Input
                          placeholder="e.g. Laptop, Documents, Clothing"
                          value={newItem.item}
                          onChange={(e) =>
                            setNewItem({ ...newItem, item: e.target.value })
                          }
                          disabled={isLoading}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Category
                        </label>
                        <Select
                          value={newItem.category}
                          onValueChange={(val) =>
                            setNewItem({ ...newItem, category: val })
                          }
                          disabled={isLoading}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>{categoryOptions}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Dimensions (cm)
                        </label>
                        <Input
                          placeholder="e.g. 30×20×10 cm"
                          value={newItem.dimensions}
                          onChange={(e) =>
                            setNewItem({ ...newItem, dimensions: e.target.value })
                          }
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Weight (kg)
                        </label>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.01"
                          placeholder="0.00"
                          value={newItem.weight}
                          onChange={(e) =>
                            setNewItem({ ...newItem, weight: e.target.value })
                          }
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="1"
                          value={newItem.quantity}
                          onChange={(e) =>
                            setNewItem({
                              ...newItem,
                              quantity: Number(e.target.value) || 1,
                            })
                          }
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        if (
                          !newItem.item ||
                          !newItem.category ||
                          !newItem.dimensions ||
                          !newItem.weight ||
                          !newItem.quantity
                        )
                          return;
                        setItems([...items, newItem]);
                        setNewItem({
                          item: "",
                          category: "",
                          dimensions: "",
                          weight: "",
                          quantity: 1,
                        });
                      }}
                      disabled={isLoading}
                      className="w-full sm:w-auto gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add item
                    </Button>
                  </CardContent>
                </Card>
              </section>

              {/* ——— Section 7: Summary & Submit ——— */}
              <section className="space-y-4 pt-2 border-t border-border">
                <h2 className="text-lg font-semibold text-foreground">
                  Summary
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Estimated Cost
                    </label>
                    <Input
                      id="estimatedCost"
                      type="text"
                      value={estimatedCost ? `$${estimatedCost}` : ""}
                      disabled
                      placeholder="Auto-calculated"
                      style={{ maxWidth: "100%" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Estimated Delivery Time
                    </label>
                    <Input
                      id="estimatedTime"
                      type="text"
                      value={estimatedTime}
                      disabled
                      placeholder="Auto-calculated"
                      style={{ maxWidth: "100%" }}
                    />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isLoading || success}
                    className="flex-1 cursor-pointer"
                  >
                    {isLoading ? "Creating..." : "Request Order"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="flex-1 cursor-pointer"
                  >
                    Cancel
                  </Button>
                </div>
              </section>
            </form>

            {/* Location permission dialog — ask before sharing */}
            {showLocationPrompt && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6">
                  <div className="flex gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPinned className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">
                        Share your location?
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        ShipHub would like to use your location to find warehouses
                        within {NEARBY_RADIUS_KM} km of you. Your location is never
                        stored or shared.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleLocationConfirm}
                      className="flex-1 cursor-pointer"
                    >
                      Allow
                    </Button>
                    <Button
                      onClick={handleLocationDecline}
                      variant="outline"
                      className="flex-1 bg-transparent cursor-pointer"
                    >
                      Not now
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <AddAddressDialog
              open={showAddAddress}
              onOpenChange={(open) => setShowAddAddress(open)}
              onSave={async (address) => {
                if (user?.id) {
                  const res = await fetch(
                    `/api/user/addresses?userId=${user.id}`,
                  );
                  const data = await res.json();
                  if (Array.isArray(data.locations)) {
                    setUserLocations(data.locations);
                    const idx = data.locations.findIndex(
                      (loc: { street?: string; postalCode?: string }) =>
                        loc.street === address.street &&
                        loc.postalCode === address.postalCode,
                    );
                    const newIdx = idx !== -1 ? idx : data.locations.length - 1;
                    if (addAddressType === "source") {
                      setFromAddressIdx(newIdx);
                      setSourceType("my");
                      setFrom(address.country);
                      setFromAddress(address.street);
                      setFromPostalCode(address.postalCode);
                    } else {
                      setToAddressIdx(newIdx);
                      setDestType("my");
                      setTo(address.country);
                      setToAddress(address.street);
                      setToPostalCode(address.postalCode);
                    }
                  }
                }
              }}
              type={addAddressType}
              userName={user?.name || ""}
              userId={user?.id || ""}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
