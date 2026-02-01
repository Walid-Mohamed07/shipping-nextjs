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
const RouteMap = dynamic(
  () => import("@/app/components/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <div className="h-[320px] rounded-lg border border-border bg-muted/50 animate-pulse" /> }
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
  Loader2,
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
import type { AddressData } from "@/app/components/LocationMapPicker";

const NEARBY_RADIUS_KM = 50;

export default function NewRequestForm() {
  // Warehouses state
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [selectedSourceWarehouse, setSelectedSourceWarehouse] = useState("");
  const [selectedDestWarehouse, setSelectedDestWarehouse] = useState("");
  const [sourcePickupMode, setSourcePickupMode] = useState("Self");
  const [destPickupMode, setDestPickupMode] = useState("Self");

  // Fetch warehouses on mount
  useEffect(() => {
    fetch("/api/warehouses")
      .then((res) => res.json())
      .then((data) => setWarehouses(data.warehouses || []));
  }, []);

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
    coordinates: undefined as { latitude: number; longitude: number } | undefined,
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

  // Destination address state
  const [toAddressIdx, setToAddressIdx] = useState(-1); // -1 means not using saved address
  const [to, setTo] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toPostalCode, setToPostalCode] = useState("");

  // Helper to get coords from address (supports Address with coordinates)
  const getCoords = (loc: { coordinates?: { latitude?: number; longitude?: number } } | null) => {
    if (!loc?.coordinates || loc.coordinates.latitude == null || loc.coordinates.longitude == null) return null;
    return { lat: loc.coordinates.latitude, lng: loc.coordinates.longitude };
  };

  // Source address coords (from saved address with coordinates)
  const sourceCoords = useMemo(
    () => getCoords(userLocations[fromAddressIdx] as { coordinates?: { latitude?: number; longitude?: number } }),
    [userLocations, fromAddressIdx]
  );

  // Dest address coords: from selected saved address or from manual addressForm (when toAddressIdx === -1)
  const destCoords = useMemo(() => {
    if (toAddressIdx >= 0) {
      return getCoords(userLocations[toAddressIdx] as { coordinates?: { latitude?: number; longitude?: number } });
    }
    const coords = addressForm.coordinates;
    if (coords?.latitude != null && coords?.longitude != null) {
      return { lat: coords.latitude, lng: coords.longitude };
    }
    return null;
  }, [userLocations, toAddressIdx, addressForm.coordinates]);

  // Source warehouses: near source address (or filter by country)
  const sourceWarehouses = useMemo(() => {
    const withCoords = warehouses.filter(
      (w) => w.latitude != null && w.longitude != null && w.status === "active"
    );
    if (sourceCoords) {
      return withCoords
        .map((w) => ({ ...w, distanceKm: getDistanceKm(sourceCoords.lat, sourceCoords.lng, w.latitude!, w.longitude!) }))
        .filter((w) => w.distanceKm <= NEARBY_RADIUS_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return warehouses.filter((w) => w.country === from && w.status === "active");
  }, [warehouses, sourceCoords, from]);

  // Dest warehouses: near dest address (or filter by country)
  const destWarehouses = useMemo(() => {
    const withCoords = warehouses.filter(
      (w) => w.latitude != null && w.longitude != null && w.status === "active"
    );
    if (destCoords) {
      return withCoords
        .map((w) => ({ ...w, distanceKm: getDistanceKm(destCoords.lat, destCoords.lng, w.latitude!, w.longitude!) }))
        .filter((w) => w.distanceKm <= NEARBY_RADIUS_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return warehouses.filter((w) => w.country === to && w.status === "active");
  }, [warehouses, destCoords, to]);

  useEffect(() => {
    if (selectedSourceWarehouse && !sourceWarehouses.some((w) => w.id === selectedSourceWarehouse)) {
      setSelectedSourceWarehouse("");
    }
  }, [sourceWarehouses, selectedSourceWarehouse]);

  useEffect(() => {
    if (selectedDestWarehouse && !destWarehouses.some((w) => w.id === selectedDestWarehouse)) {
      setSelectedDestWarehouse("");
    }
  }, [destWarehouses, selectedDestWarehouse]);

  // "Warehouses near me" (current GPS location)
  const [myLocationCoords, setMyLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [myLocationLoading, setMyLocationLoading] = useState(false);
  const [myLocationError, setMyLocationError] = useState<string | null>(null);

  // Warehouses near current GPS position
  const warehousesNearMe = useMemo(() => {
    if (!myLocationCoords) return [];
    const withCoords = warehouses.filter(
      (w) => w.latitude != null && w.longitude != null && w.status === "active"
    );
    return withCoords
      .map((w) => ({
        ...w,
        distanceKm: getDistanceKm(myLocationCoords.lat, myLocationCoords.lng, w.latitude!, w.longitude!),
      }))
      .filter((w) => w.distanceKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [warehouses, myLocationCoords]);

  const handleFindWarehousesNearMe = () => {
    if (!navigator.geolocation) {
      setMyLocationError("Geolocation is not supported");
      return;
    }
    setMyLocationLoading(true);
    setMyLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMyLocationLoading(false);
      },
      () => {
        setMyLocationError("Could not get your location");
        setMyLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

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

  const handleDeleteAddress = async (
    addr: { street?: string; postalCode?: string },
    context: "source" | "destination"
  ) => {
    if (!user?.id || !addr.street || !addr.postalCode) return;
    if (!confirm("Delete this address?")) return;
    const deletedIdx = userLocations.findIndex(
      (l: { street?: string; postalCode?: string }) =>
        l.street === addr.street && l.postalCode === addr.postalCode
    );
    try {
      const res = await fetch("/api/user/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, address: addr }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      const data = await res.json();
      if (Array.isArray(data.locations)) {
        const newLocs = data.locations;
        setUserLocations(newLocs);
        if (context === "source") {
          let newFromIdx = fromAddressIdx;
          if (deletedIdx === fromAddressIdx) newFromIdx = 0;
          else if (deletedIdx < fromAddressIdx) newFromIdx = fromAddressIdx - 1;
          setFromAddressIdx(Math.max(0, newFromIdx));
          const sel = newLocs[Math.max(0, newFromIdx)];
          setFrom(sel?.country || "");
          setFromAddress(sel?.street || "");
          setFromPostalCode(sel?.postalCode || "");
        } else {
          let newToIdx = toAddressIdx;
          if (deletedIdx === toAddressIdx) newToIdx = -1;
          else if (deletedIdx < toAddressIdx) newToIdx = toAddressIdx - 1;
          setToAddressIdx(newToIdx);
          const sel = newToIdx >= 0 ? newLocs[newToIdx] : null;
          setTo(sel?.country || "");
          setToAddress(sel?.street || "");
          setToPostalCode(sel?.postalCode || "");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete address");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    // Use selected location for 'my' address, otherwise use manual input
    const selectedSourceLoc = userLocations[fromAddressIdx] || {};
    const selectedDestLoc = userLocations[toAddressIdx] || {};
    // Build source and destination objects
    const source: any = sourceType === "my"
      ? { ...selectedSourceLoc, warehouseId: selectedSourceWarehouse, pickupMode: sourcePickupMode }
      : { ...addressForm, warehouseId: selectedSourceWarehouse, pickupMode: sourcePickupMode };
    const destination: any = destType === "my"
      ? { ...selectedDestLoc, warehouseId: selectedDestWarehouse, pickupMode: destPickupMode }
      : { ...addressForm, warehouseId: selectedDestWarehouse, pickupMode: destPickupMode };
    // Validation
    if (!source || !destination || items.length === 0 || !estimatedCost || !estimatedTime) {
      setError("Please fill in all fields and add at least one item");
      return;
    }
    if (!selectedSourceWarehouse || !selectedDestWarehouse) {
      setError("Please select both source and destination warehouses");
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
          <div className="bg-card rounded-xl border border-border shadow-md overflow-hidden">
            <div className="border-l-4 border-primary bg-primary/5 px-8 pt-8 pb-4">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Create Shipping Request
              </h1>
              <p className="text-muted-foreground">
                Fill in the details below to request a shipment
              </p>
            </div>
            <div className="p-8 pt-6">
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">
                  {error}
                </p>
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-lg flex gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    Request created successfully!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Redirecting to My Requests...
                  </p>
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ——— Section 1: Source (Origin) ——— */}
              <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-primary/30 pb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm font-bold">1</span>
                  Source (Origin)
                </h2>
                <label className="block text-sm font-medium text-muted-foreground">
                  Pick where your shipment will be collected from
                </label>
                <div role="radiogroup" className="space-y-2">
                  {userLocations.map((loc, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 border rounded-lg p-3 transition-all ${fromAddressIdx === idx ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"}`}
                    >
                      <label className="flex flex-1 items-start gap-2 cursor-pointer min-w-0">
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
                        <span className="flex-1 min-w-0">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAddress(loc, "source")}
                        disabled={isLoading}
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        aria-label="Delete address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
                      className="w-full cursor-pointer border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      + Add new address
                    </Button>
                  </div>
                </div>
                {sourceCoords && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Source location on map</p>
                    <LocationMapPicker
                      position={{ lat: sourceCoords.lat, lng: sourceCoords.lng }}
                      onPositionChange={() => {}}
                      editable={false}
                      height={180}
                    />
                  </div>
                )}
              </section>

              {/* ——— Section 3: Destination ——— */}
              <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-primary/30 pb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm font-bold">2</span>
                  Destination
                </h2>
                <label className="block text-sm font-medium text-muted-foreground">
                  Where should your shipment be delivered?
                </label>
                <div role="radiogroup" className="space-y-2">
                  {userLocations.map((loc, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 border rounded-lg p-3 transition-all ${toAddressIdx === idx ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/30"}`}
                    >
                      <label className="flex flex-1 items-start gap-2 cursor-pointer min-w-0">
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
                        <span className="flex-1 min-w-0">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAddress(loc, "destination")}
                        disabled={isLoading}
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        aria-label="Delete address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
                      className="w-full cursor-pointer border-primary/50 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                      + Add new address
                    </Button>
                  </div>
                </div>

                {/* Manual destination: when no saved address selected, use map to fill address form */}
                {toAddressIdx === -1 && (
                  <div className="mt-4 p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Enter destination address (pick on map to fill fields)
                    </p>
                    <LocationMapPicker
                      position={
                        addressForm.coordinates
                          ? { lat: addressForm.coordinates.latitude, lng: addressForm.coordinates.longitude }
                          : null
                      }
                      onPositionChange={(lat, lng) =>
                        setAddressForm((prev) => ({
                          ...prev,
                          coordinates: { latitude: lat, longitude: lng },
                        }))
                      }
                      onAddressData={(addressData: AddressData) => {
                        setAddressForm((prev) => ({
                          ...prev,
                          street: addressData.street ?? prev.street,
                          city: addressData.city ?? prev.city,
                          district: addressData.district ?? prev.district,
                          governorate: addressData.governorate ?? prev.governorate,
                          country: addressData.country ?? prev.country,
                          postalCode: addressData.postalCode ?? prev.postalCode,
                        }));
                        setTo(addressData.country ?? "");
                      }}
                      editable={true}
                      height={200}
                      showUseMyLocation
                    />
                    {(addressForm.street || addressForm.city || addressForm.country) && (
                      <p className="text-xs text-muted-foreground">
                        From map: {[addressForm.street, addressForm.city, addressForm.governorate, addressForm.country].filter(Boolean).join(", ")}
                        {addressForm.postalCode && ` (${addressForm.postalCode})`}
                      </p>
                    )}
                  </div>
                )}

                {destCoords && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Destination location on map</p>
                    <LocationMapPicker
                      position={{ lat: destCoords.lat, lng: destCoords.lng }}
                      onPositionChange={() => {}}
                      editable={false}
                      height={180}
                    />
                  </div>
                )}
              </section>

              {/* ——— Section 4: Pickup & Warehouses ——— */}
              <section className="space-y-4 rounded-lg border border-primary/20 p-4 bg-primary/5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-primary/30 pb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Warehouse className="w-4 h-4" />
                  </span>
                  Pickup & Warehouses
                </h2>
                <p className="text-sm text-muted-foreground">
                  Warehouses are filtered by proximity to selected addresses
                </p>

                {/* Warehouses near me (current GPS) */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">Warehouses near me</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFindWarehousesNearMe}
                      disabled={myLocationLoading}
                      className="gap-1.5 cursor-pointer border-primary/50 text-primary hover:bg-primary/10"
                    >
                      {myLocationLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Navigation className="w-3.5 h-3.5" />
                      )}
                      Find warehouses near me
                    </Button>
                  </div>
                  {myLocationError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {myLocationError}
                    </p>
                  )}
                  {myLocationCoords && warehousesNearMe.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Within {NEARBY_RADIUS_KM} km of your current location:
                      </p>
                      <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {warehousesNearMe.map((w) => (
                          <li
                            key={w.id}
                            className="border rounded p-2 flex flex-col text-sm"
                          >
                            <span className="font-medium">{w.name || w.id}</span>
                            <span className="text-xs text-muted-foreground">
                              {w.state || ""} {w.country || ""}
                              {"distanceKm" in w &&
                                ` · ${(w as { distanceKm: number }).distanceKm.toFixed(1)} km`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {myLocationCoords && warehousesNearMe.length === 0 && !myLocationError && (
                    <p className="text-xs text-muted-foreground">
                      No warehouses within {NEARBY_RADIUS_KM} km of your location.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Source Pickup Mode
                    </label>
                  <select
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50"
                    value={sourcePickupMode}
                      onChange={(e) => setSourcePickupMode(e.target.value)}
                      disabled={isLoading}
                      required
                    >
                      <option value="Self">Self</option>
                      <option value="Delegate">Delegate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Destination Pickup Mode
                    </label>
                    <select
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50"
                    value={destPickupMode}
                      onChange={(e) => setDestPickupMode(e.target.value)}
                      disabled={isLoading}
                      required
                    >
                      <option value="Self">Self</option>
                      <option value="Delegate">Delegate</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Source Warehouse (near origin)
                  </label>
                  <select
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50"
                    value={selectedSourceWarehouse}
                    onChange={(e) => setSelectedSourceWarehouse(e.target.value)}
                    disabled={isLoading || sourceWarehouses.length === 0}
                    required
                  >
                    <option value="" disabled>
                      {sourceWarehouses.length === 0
                        ? from
                          ? "No warehouses near source"
                          : "Select source address first"
                        : "Select source warehouse"}
                    </option>
                    {sourceWarehouses.map((w) => (
                      <option key={w.id} value={w.id} className="bg-background text-foreground">
                        {w.name || w.id} ({w.state || w.country})
                        {"distanceKm" in w
                          ? ` — ${(w as { distanceKm: number }).distanceKm.toFixed(1)} km`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {sourceCoords && sourceWarehouses.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Warehouses within 50km:</div>
                      <ul className="space-y-1">
                        {sourceWarehouses.map((w) => (
                          <li key={w.id} className="border border-border rounded-lg p-2 flex flex-col bg-card">
                            <span className="font-medium">{w.name || w.id}</span>
                            <span className="text-xs">{w.state || ''} {w.country || ''}</span>
                            {"distanceKm" in w && (
                              <span className="text-xs">Distance: {(w as { distanceKm: number }).distanceKm.toFixed(1)} km</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Destination Warehouse (near destination)
                  </label>
                  <select
                    className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50"
                    value={selectedDestWarehouse}
                    onChange={(e) => setSelectedDestWarehouse(e.target.value)}
                    disabled={isLoading || destWarehouses.length === 0}
                    required
                  >
                    <option value="" disabled>
                      {destWarehouses.length === 0
                        ? to
                          ? "No warehouses near destination"
                          : "Select destination address first"
                        : "Select destination warehouse"}
                    </option>
                    {destWarehouses.map((w) => (
                      <option key={w.id} value={w.id} className="bg-background text-foreground">
                        {w.name || w.id} ({w.state || w.country})
                        {"distanceKm" in w
                          ? ` — ${(w as { distanceKm: number }).distanceKm.toFixed(1)} km`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {destCoords && destWarehouses.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-muted-foreground mb-1">Warehouses within 50km:</div>
                      <ul className="space-y-1">
                        {destWarehouses.map((w) => (
                          <li key={w.id} className="border border-border rounded-lg p-2 flex flex-col bg-card">
                            <span className="font-medium">{w.name || w.id}</span>
                            <span className="text-xs">{w.state || ''} {w.country || ''}</span>
                            {"distanceKm" in w && (
                              <span className="text-xs">Distance: {(w as { distanceKm: number }).distanceKm.toFixed(1)} km</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>

              {/* ——— Section 4b: Route Map ——— */}
              {(sourceCoords || destCoords) && selectedSourceWarehouse && selectedDestWarehouse && (
                <section className="space-y-3 rounded-lg border border-primary/20 p-4 bg-primary/5">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-primary/30 pb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <MapPinned className="w-4 h-4" />
                    </span>
                    Route Overview
                  </h2>
                  <RouteMap
                    source={sourceCoords ? { lat: sourceCoords.lat, lng: sourceCoords.lng } : null}
                    sourceWarehouse={(() => {
                      const wh = warehouses.find((w) => w.id === selectedSourceWarehouse);
                      return wh?.latitude != null && wh?.longitude != null
                        ? { lat: wh.latitude, lng: wh.longitude }
                        : null;
                    })()}
                    destWarehouse={(() => {
                      const wh = warehouses.find((w) => w.id === selectedDestWarehouse);
                      return wh?.latitude != null && wh?.longitude != null
                        ? { lat: wh.latitude, lng: wh.longitude }
                        : null;
                    })()}
                    destination={destCoords ? { lat: destCoords.lat, lng: destCoords.lng } : null}
                  />
                </section>
              )}

              {/* ——— Section 5: Contact ——— */}
              <section className="rounded-lg border border-border bg-muted/20 p-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-primary/30 pb-2 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm font-bold">3</span>
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
              <section className="space-y-4 rounded-lg border border-border p-5 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-primary/30 pb-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <Package className="w-4 h-4" />
                      </span>
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
                <Card className="border-dashed border-primary/30 bg-primary/[0.02]">
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
                          Dimensions(cm)
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
                      className="w-full sm:w-auto gap-2 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Plus className="w-4 h-4" />
                      Add item
                    </Button>
                  </CardContent>
                </Card>
              </section>

              {/* ——— Section 7: Summary & Submit ——— */}
              <section className="space-y-4 pt-6 border-t-2 border-primary/20 rounded-lg bg-primary/5 p-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm font-bold">4</span>
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
                    className="flex-1 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  >
                    {isLoading ? "Creating..." : "Request Order"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="flex-1 cursor-pointer border-primary/50 text-primary hover:bg-primary/10"
                  >
                    Cancel
                  </Button>
                </div>
              </section>
            </form>
            </div>

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
