"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import AddAddressDialog from "./AddAddressDialog";
import { useRouter } from "next/navigation";
import type { Item } from "@/types";

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
  ImagePlus,
  Loader2,
  MapPinned,
  Navigation,
  Package,
  Plus,
  Trash2,
  Warehouse,
  X,
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

  // Pickup modes
  const [sourcePickupMode, setSourcePickupMode] = useState("Self");
  const [destPickupMode, setDestPickupMode] = useState("Self");

  // Modal state for adding/editing address
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addAddressType, setAddAddressType] = useState<
    "source" | "destination"
  >("source");
  
  const [items, setItems] = useState<Item[]>([]);
  // For new item input fields: note (optional), media (up to 4 images, preview only)
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    dimensions: "",
    weight: "",
    quantity: 1,
    note: "",
    mediaFiles: [] as File[],
    mediaPreviews: [] as string[],
  });
  // Delivery type: "normal" | "fast"
  const [deliveryType, setDeliveryType] = useState<"normal" | "fast">("normal");
  // When to start (ISO format)
  const [whenToStart, setWhenToStart] = useState<string>("");
  // Mobile is now per address location, so default to primary location's mobile
  const [mobile, setMobile] = useState(primaryLocation.mobile || "");
  const [primaryCost, setPrimaryCost] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  // Comments
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // ——— Dummy cost logic: base rate by category × weight × quantity × distance ———
  const calculateCost = (
    category: string,
    weight: string,
    quantity: number,
    from: string,
    to: string,
  ) => {
    const baseRates: Record<string, number> = {
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
    const base = baseRates[category] ?? 10;
    const weightNum = parseFloat(weight) || 1;
    const distanceMultiplier = from === to ? 1 : 1.5;
    return base * weightNum * quantity * distanceMultiplier;
  };

  // Apply delivery type surcharge: Fast = +25% on base cost
  const FAST_DELIVERY_SURCHARGE = 1.25;
  const applyDeliverySurcharge = (baseCost: number) =>
    deliveryType === "fast" ? baseCost * FAST_DELIVERY_SURCHARGE : baseCost;

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

  // Primary cost = base cost × delivery surcharge (Fast +25%); recalc when from, to, items, or deliveryType change
  React.useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current as ReturnType<typeof setTimeout>);
    }
    debounceTimeout.current = setTimeout(() => {
      const firstItem = items[0] || { category: "", weight: "", quantity: 1 };
      if (from && to && firstItem.category && firstItem.weight && firstItem.quantity) {
        const base = calculateCost(firstItem.category, firstItem.weight, firstItem.quantity, from, to);
        const primaryCostValue = applyDeliverySurcharge(base);
        setPrimaryCost(primaryCostValue.toFixed(2));
        setEstimatedTime(calculateDeliveryTime(from, to, firstItem.category));
      } else {
        setPrimaryCost("");
        setEstimatedTime("");
      }
    }, 250);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [from, to, items, deliveryType]);

  // Format estimated time as ETA: "Today 3:00 PM", "Tomorrow 10:30 AM", or "Mon, Jan 15 10:30 AM"
  const formatWhenToStart = (estimatedTimeStr: string): string => {
    if (!estimatedTimeStr) return "";
    const match = estimatedTimeStr.match(/^(\d+)-(\d+)\s*days?$/i);
    if (!match) return estimatedTimeStr;
    const minDays = parseInt(match[1], 10) || 0;
    const maxDays = parseInt(match[2], 10) || minDays;
    const daysFromNow = Math.round((minDays + maxDays) / 2);
    const eta = new Date();
    eta.setDate(eta.getDate() + daysFromNow);
    eta.setHours(10, 30, 0, 0);
    const today = new Date();
    const isToday = eta.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = eta.toDateString() === tomorrow.toDateString();
    const timeStr = eta.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (isToday) return `Today ${timeStr}`;
    if (isTomorrow) return `Tomorrow ${timeStr}`;
    return `${eta.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} ${timeStr}`;
  };

  // ——— Media upload: max 4 images, accept image only; revoke object URLs on cleanup ———
  const MAX_MEDIA_FILES = 4;
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    const current = newItem.mediaFiles.length;
    const toAdd = imageFiles.slice(0, MAX_MEDIA_FILES - current);
    if (toAdd.length === 0) return;
    const newFiles = [...newItem.mediaFiles, ...toAdd].slice(0, MAX_MEDIA_FILES);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    // Revoke previous preview URLs to avoid memory leaks
    newItem.mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    setNewItem((prev) => ({ ...prev, mediaFiles: newFiles, mediaPreviews: newPreviews }));
    e.target.value = "";
  };
  const removeMediaAt = (index: number) => {
    const newFiles = newItem.mediaFiles.filter((_, i) => i !== index);
    const urlToRevoke = newItem.mediaPreviews[index];
    if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    const newPreviews = newItem.mediaPreviews.filter((_, i) => i !== index);
    setNewItem((prev) => ({ ...prev, mediaFiles: newFiles, mediaPreviews: newPreviews }));
  };

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
      ? { ...selectedSourceLoc, pickupMode: sourcePickupMode }
      : { ...addressForm, pickupMode: sourcePickupMode };
    const destination: any = destType === "my"
      ? { ...selectedDestLoc, pickupMode: destPickupMode }
      : { ...addressForm, pickupMode: destPickupMode };
      
    // Convert whenToStart to ISO format
    let whenToStartISO = "";
    if (whenToStart) {
      whenToStartISO = new Date(whenToStart).toISOString();
    }
    
    // Validation
    if (!source || !destination || items.length === 0 || !primaryCost || !whenToStart) {
      setError("Please fill in all fields, add at least one item, and set when to start");
      return;
    }
    setIsLoading(true);
    try {
      const requestBody = {
        userId: user?.id,
        source,
        destination,
        items,
        deliveryType,
        whenToStart: whenToStartISO,
        primaryCost,
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
  className={`group relative flex items-start gap-2 border rounded-lg p-3 transition-all overflow-hidden ${
    fromAddressIdx === idx
      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
      : "border-border hover:border-primary/30"
  }`}
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
        setFromPostalCode(userLocations[idx]?.postalCode || "");
      }}
      disabled={isLoading}
      className="mt-1 shrink-0"
    />
    <div className="flex-1 min-w-0">
      {/* Always visible content */}
      <div className="font-medium truncate">{loc.fullName}</div>
      <div className="text-sm text-muted-foreground truncate">
        {loc.street}, {loc.city}
      </div>
      
      {/* Expanded content on hover */}
      <div className="max-h-0 opacity-0 group-hover:max-h-96 group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden">
        <div className="pt-2 space-y-1 text-sm">
          <div>
            <span className="font-medium">Country:</span> {loc.country}
          </div>
          <div>
            <span className="font-medium">Postal Code:</span> {loc.postalCode}
          </div>
          <div>
            <span className="font-medium">Mobile:</span> {loc.mobile}
          </div>
          <div>
            <span className="font-medium">Type:</span> {loc.addressType}
          </div>
          
          {loc.landmark && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Landmark:</span> {loc.landmark}
            </div>
          )}
          
          {loc.deliveryInstructions && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Instructions:</span>{" "}
              {loc.deliveryInstructions}
            </div>
          )}
          
          {loc.building && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Building:</span> {loc.building}
            </div>
          )}
          
          {loc.primary && (
            <div className="text-xs font-medium text-primary">
              ⭐ Primary Address
            </div>
          )}
        </div>
      </div>
    </div>
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
  className={`group relative flex items-start gap-2 border rounded-lg p-3 transition-all overflow-hidden ${
    toAddressIdx === idx
      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
      : "border-border hover:border-primary/30"
  }`}
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
      className="mt-1 shrink-0"
    />
    <div className="flex-1 min-w-0">
      {/* Always visible content */}
      <div className="font-medium truncate">{loc.fullName}</div>
      <div className="text-sm text-muted-foreground truncate">
        {loc.street}, {loc.city}
      </div>
      
      {/* Expanded content on hover */}
      <div className="max-h-0 opacity-0 group-hover:max-h-96 group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden">
        <div className="pt-2 space-y-1 text-sm">
          <div>
            <span className="font-medium">Country:</span> {loc.country}
          </div>
          <div>
            <span className="font-medium">Postal Code:</span> {loc.postalCode}
          </div>
          <div>
            <span className="font-medium">Mobile:</span> {loc.mobile}
          </div>
          <div>
            <span className="font-medium">Type:</span> {loc.addressType}
          </div>
          
          {loc.landmark && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Landmark:</span> {loc.landmark}
            </div>
          )}
          
          {loc.deliveryInstructions && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Instructions:</span>{" "}
              {loc.deliveryInstructions}
            </div>
          )}
          
          {loc.building && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Building:</span> {loc.building}
            </div>
          )}
          
          {loc.primary && (
            <div className="text-xs font-medium text-primary">
              ⭐ Primary Address
            </div>
          )}
        </div>
      </div>
    </div>
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

              {/* ——— Section 4: Pickup Modes ——— */}
              <section className="space-y-4 rounded-lg border border-primary/20 p-4 bg-primary/5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 border-b border-primary/30 pb-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Package className="w-4 h-4" />
                  </span>
                  Pickup Options
                </h2>

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
              </section>

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
                              {itm.name}
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
                          {itm.note && (
                            <p className="mt-1 text-xs text-muted-foreground italic">Note: {itm.note}</p>
                          )}
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
                          Item name
                        </label>
                        <Input
                          placeholder="e.g. Laptop, Documents, Clothing"
                          value={newItem.name}
                          onChange={(e) =>
                            setNewItem({ ...newItem, name: e.target.value })
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
                      {/* Note (optional, multiline) */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Note <span className="text-muted-foreground/70">(optional)</span>
                        </label>
                        <textarea
                          placeholder="e.g. Handle with care, leave at reception"
                          value={newItem.note}
                          onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
                          disabled={isLoading}
                          rows={3}
                          className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 disabled:opacity-50 resize-y min-h-[80px]"
                        />
                      </div>
                      {/* Media upload: up to 4 images, previews shown */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                          Media <span className="text-muted-foreground/70">(optional, max 4 images)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {newItem.mediaPreviews.map((url, idx) => (
                            <div
                              key={url}
                              className="relative w-20 h-20 rounded-lg border border-border overflow-hidden bg-muted flex-shrink-0 group"
                            >
                              <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeMediaAt(idx)}
                                className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                aria-label="Remove image"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {newItem.mediaPreviews.length < MAX_MEDIA_FILES && (
                            <label className="w-20 h-20 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors flex-shrink-0">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleMediaChange}
                                className="sr-only"
                              />
                              <ImagePlus className="w-8 h-8 text-muted-foreground" />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        if (
                          !newItem.name ||
                          !newItem.category ||
                          !newItem.dimensions ||
                          !newItem.weight ||
                          !newItem.quantity
                        )
                          return;
                        // Create new item with proper structure
                        const itemId = `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const newItemObj: Item = {
                          id: itemId,
                          name: newItem.name,
                          category: newItem.category,
                          dimensions: newItem.dimensions,
                          weight: newItem.weight,
                          quantity: newItem.quantity,
                          note: newItem.note.trim() || undefined,
                          media: [], // Media URLs would be added after upload
                        };
                        setItems([
                          ...items,
                          newItemObj,
                        ]);
                        // Revoke object URLs before reset to avoid memory leaks
                        newItem.mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
                        setNewItem({
                          name: "",
                          category: "",
                          dimensions: "",
                          weight: "",
                          quantity: 1,
                          note: "",
                          mediaFiles: [],
                          mediaPreviews: [],
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

              {/* ——— Section 7: Order Summary & Submit ——— */}
              <section className="space-y-4 pt-6 border-t-2 border-primary/20 rounded-lg bg-primary/5 p-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm font-bold">4</span>
                  Delivery & Cost
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Delivery Type at the top */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Delivery Type
                    </label>
                    <select
                      className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50"
                      value={deliveryType}
                      onChange={(e) => setDeliveryType(e.target.value as "normal" | "fast")}
                      disabled={isLoading}
                    >
                      <option value="normal" className="bg-background text-foreground">Normal</option>
                      <option value="fast" className="bg-background text-foreground">Fast (+25%)</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fast delivery adds a 25% surcharge to the base cost.
                    </p>
                  </div>
                  
                  {/* When to Start - using datetime-local */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      When to Start 
                    </label>
                    <Input
                      type="datetime-local"
                      value={whenToStart}
                      onChange={(e) => setWhenToStart(e.target.value)}
                      disabled={isLoading}
                      className="w-full"
                    />
                  </div>
                  
                  {/* Primary Cost - Read-only auto-calculated */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Primary Cost
                    </label>
                    <Input
                      type="text"
                      value={primaryCost ? `$${primaryCost}` : "Auto-calculating..."}
                      disabled
                      className="w-full bg-muted text-muted-foreground"
                    />
                    {deliveryType === "fast" && primaryCost && (
                      <p className="text-xs text-muted-foreground mt-1">Includes Fast delivery surcharge (+25%)</p>
                    )}
                  </div>
                  
                  {/* Estimated Time */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Estimated Time
                    </label>
                    <Input
                      type="text"
                      value={estimatedTime || "Auto-calculating..."}
                      disabled
                      className="w-full bg-muted text-muted-foreground"
                    />
                  </div>
                </div>
              </section>

              {/* ——— Comments Section ——— */}
              <section className="space-y-4 mt-4">
                <label className="block text-sm font-medium text-foreground">
                  Comments <span className="text-muted-foreground/70">(optional)</span>
                </label>
                <textarea
                  placeholder="Add any additional comments or special instructions"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={isLoading}
                  rows={3}
                  className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary/50 disabled:opacity-50 resize-y min-h-[80px]"
                />
              </section>

              {/* ——— Buttons: Outside section ——— */}
              <div className="flex gap-4 mt-4">
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
