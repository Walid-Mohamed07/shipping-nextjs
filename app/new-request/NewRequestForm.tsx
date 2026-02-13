"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import AddAddressDialog from "./AddAddressDialog";
import ReviewModal from "./ReviewModal";
import type { ReviewData } from "./ReviewModal";
import { useRouter } from "next/navigation";
import type { Item, Address } from "@/types";
import { toast, Toaster } from "sonner";

const LocationMapPicker = dynamic(
  () =>
    import("@/app/components/LocationMapPicker").then(
      (m) => m.LocationMapPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-70 rounded-lg border border-gray-300 bg-gray-100 animate-pulse" />
    ),
  },
);
const RouteMap = dynamic(
  () => import("@/app/components/RouteMap").then((m) => m.RouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 rounded-lg border border-gray-300 bg-gray-100 animate-pulse" />
    ),
  },
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
  Wrench,
  BoxSelect,
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
    coordinates: undefined as
      | { latitude: number; longitude: number }
      | undefined,
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
    userLocations.find((loc: { primary?: boolean }) => loc.primary) ||
    userLocations[0] ||
    {};

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

  // Clear destination when source address changes
  useEffect(() => {
    setToAddressIdx(-1);
    setTo("");
    setToAddress("");
    setToPostalCode("");
  }, [fromAddressIdx]);

  // Helper to get coords from address (supports Address with coordinates)
  const getCoords = (
    loc: { coordinates?: { latitude?: number; longitude?: number } } | null,
  ) => {
    if (
      !loc?.coordinates ||
      loc.coordinates.latitude == null ||
      loc.coordinates.longitude == null
    )
      return null;
    return { lat: loc.coordinates.latitude, lng: loc.coordinates.longitude };
  };

  // Source address coords (from saved address with coordinates)
  const sourceCoords = useMemo(
    () =>
      getCoords(
        userLocations[fromAddressIdx] as {
          coordinates?: { latitude?: number; longitude?: number };
        },
      ),
    [userLocations, fromAddressIdx],
  );

  // Dest address coords: from selected saved address or from manual addressForm (when toAddressIdx === -1)
  const destCoords = useMemo(() => {
    if (toAddressIdx >= 0) {
      return getCoords(
        userLocations[toAddressIdx] as {
          coordinates?: { latitude?: number; longitude?: number };
        },
      );
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

  // Image zoom modal state
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

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
    services: {
      canBeAssembledDisassembled: false,
      assemblyDisassemblyHandler: undefined as "self" | "company" | undefined,
      packaging: false,
    },
  });
  // Delivery type: "Normal" | "Urgent"
  const [deliveryType, setDeliveryType] = useState<"Normal" | "Urgent">(
    "Normal",
  );
  // When to start (ISO format)
  const [whenToStart, setWhenToStart] = useState<string>("");
  // Mobile is now per address location, so default to primary location's mobile
  const [mobile, setMobile] = useState(primaryLocation.mobile || "");
  const [primaryCost, setPrimaryCost] = useState("");
  // Comments
  const [comments, setComments] = useState("");
  // Review modal
  const [showReview, setShowReview] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: boolean;
  }>({});
  const [itemValidationErrors, setItemValidationErrors] = useState<{
    [key: string]: boolean;
  }>({});
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
    deliveryType === "Urgent" ? baseCost * FAST_DELIVERY_SURCHARGE : baseCost;

  // Primary cost = base cost × delivery surcharge (Fast +25%); recalc when from, to, items, or deliveryType change
  React.useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current as ReturnType<typeof setTimeout>);
    }
    debounceTimeout.current = setTimeout(() => {
      const firstItem = items[0] || { category: "", weight: "", quantity: 1 };
      if (
        from &&
        to &&
        firstItem.category &&
        firstItem.weight &&
        firstItem.quantity
      ) {
        const base = calculateCost(
          firstItem.category,
          firstItem.weight,
          firstItem.quantity,
          from,
          to,
        );
        const primaryCostValue = applyDeliverySurcharge(base);
        setPrimaryCost(primaryCostValue.toFixed(2));
      } else {
        setPrimaryCost("");
      }
    }, 250);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [from, to, items, deliveryType]);

  // Handle ESC key to close image zoom modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showImageZoom) {
        setShowImageZoom(false);
        setSelectedImageUrl(null);
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [showImageZoom]);

  // ——— Media upload: max 4 images, accept image only; revoke object URLs on cleanup ———
  const MAX_MEDIA_FILES = 4;
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    const current = newItem.mediaFiles.length;
    const toAdd = imageFiles.slice(0, MAX_MEDIA_FILES - current);
    if (toAdd.length === 0) return;
    const newFiles = [...newItem.mediaFiles, ...toAdd].slice(
      0,
      MAX_MEDIA_FILES,
    );
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    // Revoke previous preview URLs to avoid memory leaks
    newItem.mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    setNewItem((prev) => ({
      ...prev,
      mediaFiles: newFiles,
      mediaPreviews: newPreviews,
    }));
    e.target.value = "";
  };
  const removeMediaAt = (index: number) => {
    const newFiles = newItem.mediaFiles.filter((_, i) => i !== index);
    const urlToRevoke = newItem.mediaPreviews[index];
    if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    const newPreviews = newItem.mediaPreviews.filter((_, i) => i !== index);
    setNewItem((prev) => ({
      ...prev,
      mediaFiles: newFiles,
      mediaPreviews: newPreviews,
    }));
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
    addr: { id?: string; street?: string; postalCode?: string },
    context: "source" | "destination",
  ) => {
    if (!user?.id) return;

    // Find location by ID or fallback to street + postalCode lookup
    let locationId = addr.id;
    let deletedIdx = -1;

    if (locationId) {
      deletedIdx = userLocations.findIndex((l: any) => l.id === locationId);
    } else if (addr.street && addr.postalCode) {
      deletedIdx = userLocations.findIndex(
        (l: { street?: string; postalCode?: string }) =>
          l.street === addr.street && l.postalCode === addr.postalCode,
      );
      if (deletedIdx !== -1) {
        locationId = userLocations[deletedIdx]?.id;
      }
    }

    if (!locationId) return;
    if (!confirm("Delete this address?")) return;

    try {
      const res = await fetch("/api/user/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, locationId }),
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
    setValidationErrors({});

    const errors: { [key: string]: boolean } = {};

    // Get selected locations
    const selectedSourceLoc = userLocations[fromAddressIdx] || {};
    const selectedDestLoc = userLocations[toAddressIdx] || {};

    // Validate source address
    if (!selectedSourceLoc || Object.keys(selectedSourceLoc).length === 0) {
      errors.sourceAddress = true;
      toast.error("Please select a source address");
    }

    // Validate destination address
    if (
      !selectedDestLoc ||
      Object.keys(selectedDestLoc).length === 0 ||
      toAddressIdx === -1
    ) {
      errors.destinationAddress = true;
      toast.error("Please select a destination address");
    }

    // Validate items
    if (items.length === 0) {
      errors.items = true;
      toast.error("Please add at least one item");
    }

    // Validate when to start
    if (!whenToStart) {
      errors.whenToStart = true;
      toast.error("Please set when to start");
    }

    // Validate mobile
    if (!mobile || mobile.trim() === "") {
      errors.mobile = true;
      toast.error("Please enter mobile number");
    }

    // If there are validation errors, stop submission
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fill in all required fields");
      return;
    }

    // All validation passed — open review modal
    setShowReview(true);
  };

  const handleConfirmSubmit = async () => {
    // Get selected locations
    const selectedSourceLoc = userLocations[fromAddressIdx] || {};
    const selectedDestLoc = userLocations[toAddressIdx] || {};

    // Build source and destination objects with pickup modes
    const source: any = { ...selectedSourceLoc, pickupMode: sourcePickupMode };
    const destination: any = { ...selectedDestLoc, pickupMode: destPickupMode };

    // Convert whenToStart to ISO format
    let whenToStartISO = "";
    if (whenToStart) {
      whenToStartISO = new Date(whenToStart).toISOString();
    }

    setIsLoading(true);
    try {
      // Check if there are any media files to upload
      const hasMediaFiles = items.some(
        (item) => item.mediaFiles && item.mediaFiles.length > 0,
      );

      if (hasMediaFiles) {
        toast.loading("Uploading media files...");
      }

      // Upload media files for items and get URLs
      const formattedItems = await Promise.all(
        items.map(async (item) => {
          let uploadedUrls: string[] = [];

          // Upload media files if they exist
          if (item.mediaFiles && item.mediaFiles.length > 0) {
            const formData = new FormData();
            for (const file of item.mediaFiles) {
              formData.append("files", file);
            }

            const uploadResponse = await fetch("/api/upload/media", {
              method: "POST",
              body: formData,
            });

            if (!uploadResponse.ok) {
              throw new Error("Failed to upload media files");
            }

            const uploadData = await uploadResponse.json();
            uploadedUrls = uploadData.urls || [];
          }

          return {
            ...item,
            item: item.name, // Add "item" field for compatibility
            media: uploadedUrls.map((url) => ({
              url,
              existing: false,
            })),
            // Remove mediaFiles as they're not JSON serializable
            mediaFiles: undefined,
          };
        }),
      );

      if (hasMediaFiles) {
        toast.dismiss();
      }

      const requestBody = {
        userId: user?.id,
        source,
        destination,
        items: formattedItems,
        deliveryType,
        startTime: whenToStartISO,
        primaryCost: primaryCost,
        cost: primaryCost,
        requestStatus: "Pending",
        deliveryStatus: "Pending",
        comment: comments || "",
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
      setShowReview(false);
      toast.success("Request created successfully!");

      // Reset form inputs
      setItems([]);
      setNewItem({
        name: "",
        category: "",
        dimensions: "",
        weight: "",
        quantity: 1,
        note: "",
        mediaFiles: [],
        mediaPreviews: [],
        services: {
          canBeAssembledDisassembled: false,
          assemblyDisassemblyHandler: undefined,
          packaging: false,
        },
      });
      setDeliveryType("Normal");
      setWhenToStart("");
      setComments("");
      setPrimaryCost("");
      setMobile(primaryLocation.mobile || "");

      // Reset address selections to primary location
      setFromAddressIdx(0);
      setToAddressIdx(-1);
      setFrom(primaryLocation.country || "");
      setFromAddress(primaryLocation.street || "");
      setFromPostalCode(primaryLocation.postalCode || "");
      setTo("");
      setToAddress("");
      setToPostalCode("");

      // Reset pickup modes
      setSourcePickupMode("Self");
      setDestPickupMode("Self");

      setTimeout(() => {
        router.push("/my-requests");
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create request";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-600">
              Please log in to create a shipping request.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create Shipping Request
            </h1>
            <p className="text-gray-600 text-sm">
              Fill in the details below to request your shipment
            </p>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 sm:p-10">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Request created successfully!
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Redirecting to My Requests...
                    </p>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ——— Section 1: Source (Origin) ——— */}
                <section
                  className={`rounded-lg border p-6 ${
                    validationErrors.sourceAddress
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
                      1
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Source (Origin)
                      </h2>
                      <p className="text-sm text-gray-600 mt-0.5">
                        Pick where your shipment will be collected from
                      </p>
                    </div>
                  </div>
                  <div role="radiogroup" className="space-y-3">
                    {userLocations.map((loc, idx) => (
                      <div
                        key={idx}
                        className={`group relative flex items-start gap-3 rounded-lg p-4 transition-colors border ${
                          fromAddressIdx === idx
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        <label className="flex flex-1 items-start gap-3 cursor-pointer min-w-0">
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
                            className="mt-1 shrink-0 h-4 w-4 text-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            {/* Always visible content */}
                            <div className="font-semibold text-gray-900 truncate">
                              {loc.fullName}
                            </div>
                            <div className="text-sm text-gray-600 truncate mt-1">
                              {loc.street}, {loc.city}
                            </div>

                            {/* Expanded content on hover */}
                            <div className="max-h-0 opacity-0 group-hover:max-h-96 group-hover:opacity-100 transition-all duration-200 overflow-hidden">
                              <div className="pt-2 space-y-1 text-sm text-gray-700 border-t border-gray-200 mt-2">
                                <div>
                                  <span className="font-medium text-gray-900">
                                    Country:
                                  </span>{" "}
                                  <span className="text-gray-600">
                                    {loc.country}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900">
                                    Postal Code:
                                  </span>{" "}
                                  <span className="text-gray-600">
                                    {loc.postalCode}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900">
                                    Mobile:
                                  </span>{" "}
                                  <span className="text-gray-600">
                                    {loc.mobile}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900">
                                    Type:
                                  </span>{" "}
                                  <span className="text-gray-600">
                                    {loc.addressType}
                                  </span>
                                </div>

                                {loc.landmark && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">
                                      Landmark:
                                    </span>{" "}
                                    {loc.landmark}
                                  </div>
                                )}

                                {loc.deliveryInstructions && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">
                                      Instructions:
                                    </span>{" "}
                                    {loc.deliveryInstructions}
                                  </div>
                                )}

                                {loc.building && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">
                                      Building:
                                    </span>{" "}
                                    {loc.building}
                                  </div>
                                )}

                                {loc.primary && (
                                  <div className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded mt-2">
                                    ⭐ Primary
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
                          className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer rounded-lg"
                          aria-label="Delete address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setAddAddressType("source");
                          setShowAddAddress(true);
                        }}
                        disabled={isLoading}
                        className="w-full cursor-pointer border border-dashed border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-500 hover:text-gray-900 bg-white rounded-lg h-11 font-medium"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add new address
                      </Button>
                    </div>
                  </div>
                  {sourceCoords && (
                    <div className="mt-5 rounded-lg overflow-hidden border border-gray-200">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <p className="text-xs font-medium text-gray-700">
                          Source location on map
                        </p>
                      </div>
                      <LocationMapPicker
                        position={{
                          lat: sourceCoords.lat,
                          lng: sourceCoords.lng,
                        }}
                        onPositionChange={() => {}}
                        editable={false}
                        height={180}
                      />
                    </div>
                  )}
                </section>

                {/* ——— Section 3: Destination ——— */}
                {fromAddressIdx >= 0 && (
                  <section
                    className={`rounded-lg border p-6 ${
                      validationErrors.destinationAddress
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
                        2
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          Destination
                        </h2>
                        <p className="text-sm text-gray-600 mt-0.5">
                          Where should your shipment be delivered?
                        </p>
                      </div>
                    </div>
                    <div role="radiogroup" className="space-y-3">
                      {userLocations
                        .map((loc, idx) => ({ loc, idx }))
                        .filter(({ idx }) => idx !== fromAddressIdx)
                        .map(({ loc, idx }) => (
                          <div
                            key={idx}
                            className={`group relative flex items-start gap-3 rounded-lg p-4 transition-colors border ${
                              toAddressIdx === idx
                                ? "border-blue-600 bg-blue-50"
                                : "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50"
                            }`}
                          >
                            <label className="flex flex-1 items-start gap-3 cursor-pointer min-w-0">
                              <input
                                type="radio"
                                name="destinationAddress"
                                value={idx}
                                checked={toAddressIdx === idx}
                                onChange={() => {
                                  setToAddressIdx(idx);
                                  setDestType("my");
                                  setTo(userLocations[idx]?.country || "");
                                  setToAddress(
                                    userLocations[idx]?.street || "",
                                  );
                                  setToPostalCode(
                                    userLocations[idx]?.postalCode || "",
                                  );
                                }}
                                disabled={isLoading}
                                className="mt-1 shrink-0 h-4 w-4 text-blue-600"
                              />
                              <div className="flex-1 min-w-0">
                                {/* Always visible content */}
                                <div className="font-semibold text-gray-900 truncate">
                                  {loc.fullName}
                                </div>
                                <div className="text-sm text-gray-600 truncate mt-1">
                                  {loc.street}, {loc.city}
                                </div>

                                {/* Expanded content on hover */}
                                <div className="max-h-0 opacity-0 group-hover:max-h-96 group-hover:opacity-100 transition-all duration-300 ease-in-out overflow-hidden">
                                  <div className="pt-3 space-y-1.5 text-sm text-gray-700 border-t border-gray-200 mt-3">
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        Country:
                                      </span>{" "}
                                      <span className="text-gray-600">
                                        {loc.country}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        Postal Code:
                                      </span>{" "}
                                      <span className="text-gray-600">
                                        {loc.postalCode}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        Mobile:
                                      </span>{" "}
                                      <span className="text-gray-600">
                                        {loc.mobile}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        Type:
                                      </span>{" "}
                                      <span className="text-gray-600">
                                        {loc.addressType}
                                      </span>
                                    </div>

                                    {loc.landmark && (
                                      <div className="text-xs text-gray-600">
                                        <span className="font-semibold">
                                          Landmark:
                                        </span>{" "}
                                        {loc.landmark}
                                      </div>
                                    )}

                                    {loc.deliveryInstructions && (
                                      <div className="text-xs text-gray-600">
                                        <span className="font-semibold">
                                          Instructions:
                                        </span>{" "}
                                        {loc.deliveryInstructions}
                                      </div>
                                    )}

                                    {loc.building && (
                                      <div className="text-xs text-gray-600">
                                        <span className="font-semibold">
                                          Building:
                                        </span>{" "}
                                        {loc.building}
                                      </div>
                                    )}

                                    {loc.primary && (
                                      <div className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded mt-2">
                                        ⭐ Primary
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
                              onClick={() =>
                                handleDeleteAddress(loc, "destination")
                              }
                              disabled={isLoading}
                              className="h-9 w-9 shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer rounded-xl transition-colors"
                              aria-label="Delete address"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setAddAddressType("destination");
                            setShowAddAddress(true);
                          }}
                          disabled={isLoading}
                          className="w-full cursor-pointer border border-dashed border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-500 hover:text-gray-900 bg-white rounded-lg h-11 font-medium"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add new address
                        </Button>
                      </div>
                    </div>

                    {destCoords && (
                      <div className="mt-5 rounded-lg overflow-hidden border border-gray-200">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700">
                            Destination location on map
                          </p>
                        </div>
                        <LocationMapPicker
                          position={{
                            lat: destCoords.lat,
                            lng: destCoords.lng,
                          }}
                          onPositionChange={() => {}}
                          editable={false}
                          height={180}
                        />
                      </div>
                    )}
                  </section>
                )}

                {/* ——— Section 4: Pickup Modes ——— */}
                <section className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Pickup Options
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Source Pickup Mode
                      </label>
                      <select
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Destination Pickup Mode
                      </label>
                      <select
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <section
                  className={`rounded-lg border p-6 ${
                    validationErrors.mobile
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
                      3
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Contact</h2>
                  </div>
                  <div>
                    <label
                      htmlFor="mobile"
                      className="block text-sm font-medium text-gray-900 mb-2"
                    >
                      Mobile Number
                    </label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="Enter your mobile number"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      disabled={isLoading}
                      required
                      style={{ maxWidth: "100%" }}
                      className={`h-10 rounded-lg border ${validationErrors.mobile ? "border-red-500 bg-red-50" : "border-gray-300"}`}
                    />
                  </div>
                </section>

                {/* ——— Section 6: Items ——— */}
                <section
                  className={`rounded-lg border p-6 ${
                    validationErrors.items
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">
                          Shipment Items
                        </h2>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {items.length === 0
                            ? "Add at least one item to continue"
                            : `${items.length} item${items.length !== 1 ? "s" : ""} added`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Item list */}
                  {items.length > 0 && (
                    <div className="space-y-3 mb-5">
                      {items.map((itm, idx) => (
                        <div
                          key={idx}
                          className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-400 hover:bg-gray-50"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {itm.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-700"
                              >
                                {itm.category}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              Dimensions: {itm.dimensions}
                              <span className="mx-1.5">·</span>
                              {itm.weight} kg
                              <span className="mx-1.5">·</span>
                              Qty: {itm.quantity}
                            </p>
                            {(itm.services?.canBeAssembledDisassembled ||
                              itm.services?.packaging) && (
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {itm.services?.canBeAssembledDisassembled && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-amber-300 bg-amber-50 text-amber-700"
                                  >
                                    <Wrench className="w-3 h-3 mr-1" />
                                    Assembly/Disassembly
                                    {itm.services
                                      ?.assemblyDisassemblyHandler === "company"
                                      ? " (Company)"
                                      : " (Self)"}
                                  </Badge>
                                )}
                                {itm.services?.packaging && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-purple-300 bg-purple-50 text-purple-700"
                                  >
                                    <Package className="w-3 h-3 mr-1" />
                                    Packaging
                                  </Badge>
                                )}
                              </div>
                            )}
                            {itm.note && (
                              <p className="mt-2 text-xs text-gray-600 italic bg-gray-50 rounded px-2 py-1 inline-block">
                                Note: {itm.note}
                              </p>
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
                            className="h-8 w-8 shrink-0 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add item form */}
                  <Card className="border border-dashed border-gray-300 bg-gray-50 rounded-lg">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-gray-700" />
                        <p className="text-sm font-semibold text-gray-900">
                          Add new item
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Item name
                          </label>
                          <Input
                            placeholder="e.g. Laptop, Documents, Clothing"
                            value={newItem.name}
                            onChange={(e) =>
                              setNewItem({ ...newItem, name: e.target.value })
                            }
                            disabled={isLoading}
                            className={`w-full h-10 rounded-lg ${itemValidationErrors.itemName ? "border-red-500 bg-red-50" : ""}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Category
                          </label>
                          <Select
                            value={newItem.category}
                            onValueChange={(val) =>
                              setNewItem({ ...newItem, category: val })
                            }
                            disabled={isLoading}
                          >
                            <SelectTrigger
                              className={`w-full h-10 rounded-lg ${itemValidationErrors.itemCategory ? "border-red-500 bg-red-50" : ""}`}
                            >
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>{categoryOptions}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Dimensions (cm)
                          </label>
                          <Input
                            placeholder="e.g. 30×20×10 cm"
                            value={newItem.dimensions}
                            onChange={(e) =>
                              setNewItem({
                                ...newItem,
                                dimensions: e.target.value,
                              })
                            }
                            disabled={isLoading}
                            className={`h-10 rounded-lg ${itemValidationErrors.itemDimensions ? "border-red-500 bg-red-50" : ""}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
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
                            className={`h-10 rounded-lg ${itemValidationErrors.itemWeight ? "border-red-500 bg-red-50" : ""}`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
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
                            className={`h-10 rounded-lg ${itemValidationErrors.itemQuantity ? "border-red-500 bg-red-50" : ""}`}
                          />
                        </div>
                        {/* Note (optional, multiline) */}
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Note{" "}
                            <span className="text-gray-500">(optional)</span>
                          </label>
                          <textarea
                            placeholder="e.g. Handle with care, leave at reception"
                            value={newItem.note}
                            onChange={(e) =>
                              setNewItem({ ...newItem, note: e.target.value })
                            }
                            disabled={isLoading}
                            rows={3}
                            className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 resize-y"
                          />
                        </div>
                        {/* Media upload: up to 4 images, previews shown */}
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Media{" "}
                            <span className="text-gray-500">
                              (optional, max 4 images)
                            </span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {newItem.mediaPreviews.map((url, idx) => (
                              <div
                                key={url}
                                className="relative w-20 h-20 rounded-lg border border-gray-300 overflow-hidden bg-gray-50 shrink-0 group cursor-pointer"
                                onClick={() => {
                                  setSelectedImageUrl(url);
                                  setShowImageZoom(true);
                                }}
                              >
                                <img
                                  src={url}
                                  alt={`Preview ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeMediaAt(idx);
                                  }}
                                  className="absolute top-1 right-1 p-1 rounded-lg bg-red-500 text-white hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  aria-label="Remove image"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            {newItem.mediaPreviews.length < MAX_MEDIA_FILES && (
                              <label className="w-20 h-20 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-colors shrink-0 bg-white">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={handleMediaChange}
                                  className="sr-only"
                                />
                                <ImagePlus className="w-6 h-6 text-gray-500" />
                              </label>
                            )}
                          </div>
                        </div>
                        {/* Services (optional) */}
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Additional Services{" "}
                            <span className="text-gray-500">(optional)</span>
                          </label>
                          <div className="space-y-3">
                            {/* Assembly & Disassembly - Primary Question */}
                            <div className="rounded-lg border border-gray-300 p-3 bg-white hover:bg-gray-50">
                              <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    newItem.services.canBeAssembledDisassembled
                                  }
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setNewItem((prev) => ({
                                      ...prev,
                                      services: {
                                        ...prev.services,
                                        canBeAssembledDisassembled: checked,
                                        // Reset handler when unchecked
                                        assemblyDisassemblyHandler: checked
                                          ? prev.services
                                              .assemblyDisassemblyHandler
                                          : undefined,
                                      },
                                    }));
                                  }}
                                  disabled={isLoading}
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-gray-900 cursor-pointer"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <Wrench className="w-4 h-4 text-gray-700" />
                                    <span className="font-medium text-gray-900 text-sm">
                                      Can this item be assembled and
                                      disassembled?
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Check if this item can be disassembled for
                                    transport and reassembled at destination
                                  </p>
                                </div>
                              </label>

                              {/* Conditional Assembly & Disassembly Options */}
                              {newItem.services.canBeAssembledDisassembled && (
                                <div className="mt-3 pl-6 space-y-2 border-l-2 border-gray-400">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 mb-1">
                                      Assembly &amp; Disassembly Options
                                    </p>
                                    <p className="text-xs text-gray-600 mb-2">
                                      Who will handle the assembly and
                                      disassembly?
                                    </p>
                                  </div>

                                  {/* Radio Option 1: Self */}
                                  <label className="flex items-start gap-2 rounded-lg border border-gray-300 p-2.5 cursor-pointer hover:border-gray-400 hover:bg-gray-50 bg-white">
                                    <input
                                      type="radio"
                                      name="assemblyHandler"
                                      value="self"
                                      checked={
                                        newItem.services
                                          .assemblyDisassemblyHandler === "self"
                                      }
                                      onChange={(e) =>
                                        setNewItem((prev) => ({
                                          ...prev,
                                          services: {
                                            ...prev.services,
                                            assemblyDisassemblyHandler: "self",
                                          },
                                        }))
                                      }
                                      disabled={isLoading}
                                      className="mt-0.5 h-4 w-4 shrink-0 text-gray-900 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                      <span className="text-sm font-medium text-gray-900">
                                        I will handle the assembly and
                                        disassembly myself
                                      </span>
                                      <p className="text-xs text-gray-600 mt-0.5">
                                        No additional cost
                                      </p>
                                    </div>
                                  </label>

                                  {/* Radio Option 2: Company */}
                                  <label className="flex items-start gap-2 rounded-lg border border-gray-300 p-2.5 cursor-pointer hover:border-gray-400 hover:bg-gray-50 bg-white">
                                    <input
                                      type="radio"
                                      name="assemblyHandler"
                                      value="company"
                                      checked={
                                        newItem.services
                                          .assemblyDisassemblyHandler ===
                                        "company"
                                      }
                                      onChange={(e) =>
                                        setNewItem((prev) => ({
                                          ...prev,
                                          services: {
                                            ...prev.services,
                                            assemblyDisassemblyHandler:
                                              "company",
                                          },
                                        }))
                                      }
                                      disabled={isLoading}
                                      className="mt-0.5 h-4 w-4 shrink-0 text-gray-900 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                      <span className="text-sm font-medium text-gray-900">
                                        The company will handle the assembly and
                                        disassembly for me
                                      </span>
                                      <p className="text-xs text-amber-600 mt-0.5 font-medium">
                                        May include additional cost
                                      </p>
                                    </div>
                                  </label>
                                </div>
                              )}
                            </div>

                            {/* Packaging toggle */}
                            <label className="flex items-start gap-2 rounded-lg border border-gray-300 p-3 cursor-pointer hover:border-gray-400 hover:bg-gray-50 bg-white">
                              <input
                                type="checkbox"
                                checked={newItem.services.packaging}
                                onChange={(e) =>
                                  setNewItem((prev) => ({
                                    ...prev,
                                    services: {
                                      ...prev.services,
                                      packaging: e.target.checked,
                                    },
                                  }))
                                }
                                disabled={isLoading}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-gray-900 cursor-pointer"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                  <BoxSelect className="w-4 h-4 text-gray-700" />
                                  <span className="font-medium text-gray-900 text-sm">
                                    Packaging
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  Professional packaging to protect during
                                  shipping
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          // Reset item validation errors
                          setItemValidationErrors({});
                          const errors: { [key: string]: boolean } = {};

                          // Validate required fields
                          if (!newItem.name) {
                            errors.itemName = true;
                            toast.error("Item name is required");
                          }
                          if (!newItem.category) {
                            errors.itemCategory = true;
                            toast.error("Category is required");
                          }
                          if (!newItem.dimensions) {
                            errors.itemDimensions = true;
                            toast.error("Dimensions are required");
                          }
                          if (!newItem.weight) {
                            errors.itemWeight = true;
                            toast.error("Weight is required");
                          }
                          if (!newItem.quantity) {
                            errors.itemQuantity = true;
                            toast.error("Quantity is required");
                          }

                          // Validate assembly/disassembly handler if checkbox is checked
                          if (
                            newItem.services.canBeAssembledDisassembled &&
                            !newItem.services.assemblyDisassemblyHandler
                          ) {
                            errors.assemblyHandler = true;
                            toast.error(
                              "Please select who will handle assembly and disassembly",
                            );
                          }

                          if (Object.keys(errors).length > 0) {
                            setItemValidationErrors(errors);
                            toast.error(
                              "Please fill in all required item fields",
                            );
                            return;
                          }

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
                            mediaFiles: newItem.mediaFiles, // Store files for later upload
                            services: {
                              canBeAssembledDisassembled:
                                newItem.services.canBeAssembledDisassembled,
                              assemblyDisassemblyHandler: newItem.services
                                .canBeAssembledDisassembled
                                ? newItem.services.assemblyDisassemblyHandler
                                : undefined,
                              packaging: newItem.services.packaging,
                            },
                          };
                          setItems([...items, newItemObj]);
                          toast.success("Item added successfully!");
                          // Revoke object URLs before reset to avoid memory leaks
                          newItem.mediaPreviews.forEach((url) =>
                            URL.revokeObjectURL(url),
                          );
                          setNewItem({
                            name: "",
                            category: "",
                            dimensions: "",
                            weight: "",
                            quantity: 1,
                            note: "",
                            mediaFiles: [],
                            mediaPreviews: [],
                            services: {
                              canBeAssembledDisassembled: false,
                              assemblyDisassemblyHandler: undefined,
                              packaging: false,
                            },
                          });
                        }}
                        disabled={isLoading}
                        className="w-full sm:w-auto gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 px-6 rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                        Add item
                      </Button>
                    </CardContent>
                  </Card>
                </section>

                {/* ——— Section 7: Delivery & Cost ——— */}
                <section className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
                      4
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Delivery &amp; Cost
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Delivery Type at the top */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Delivery Type
                      </label>
                      <select
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={deliveryType}
                        onChange={(e) =>
                          setDeliveryType(e.target.value as "Normal" | "Urgent")
                        }
                        disabled={isLoading}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Urgent">Urgent (+25%)</option>
                      </select>
                      <p className="text-xs text-gray-600 mt-1.5">
                        Urgent delivery adds a 25% surcharge to the base cost.
                      </p>
                    </div>

                    {/* Primary Cost - Read-only auto-calculated */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Primary Cost
                      </label>
                      <Input
                        type="text"
                        value={
                          primaryCost
                            ? `$${primaryCost}`
                            : "Auto-calculating..."
                        }
                        disabled
                        className="w-full h-10 rounded-lg bg-gray-50 text-gray-700 border-gray-300 font-semibold"
                      />
                      {deliveryType === "Urgent" && primaryCost && (
                        <p className="text-xs text-amber-600 mt-1.5 font-medium">
                          Includes Urgent delivery surcharge (+25%)
                        </p>
                      )}
                    </div>

                    {/* When to Start */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        When to Start
                      </label>
                      <Input
                        type="datetime-local"
                        value={whenToStart}
                        onChange={(e) => setWhenToStart(e.target.value)}
                        disabled={isLoading}
                        className={`w-full h-10 rounded-lg ${validationErrors.whenToStart ? "border-red-500 bg-red-50" : ""}`}
                      />
                    </div>
                  </div>
                </section>

                {/* ——— Comments Section ——— */}
                <section className="rounded-lg border border-gray-200 bg-white p-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Comments <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    placeholder="Add any additional comments or special instructions"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    disabled={isLoading}
                    rows={4}
                    className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 disabled:opacity-50 resize-y"
                  />
                </section>

                {/* ——— Buttons: Outside section ——— */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-gray-200">
                  <Button
                    type="submit"
                    disabled={isLoading || success}
                    className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 rounded-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Review & Submit"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="flex-1 cursor-pointer border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white font-medium h-12 rounded-lg"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>

            <ReviewModal
              open={showReview}
              onClose={() => setShowReview(false)}
              onConfirm={handleConfirmSubmit}
              isLoading={isLoading}
              data={{
                items,
                sourceAddress:
                  (userLocations[fromAddressIdx] as Address) || null,
                destinationAddress:
                  toAddressIdx >= 0
                    ? (userLocations[toAddressIdx] as Address) || null
                    : null,
                sourcePickupMode,
                destPickupMode,
                deliveryType,
                whenToStart,
                mobile,
                primaryCost,
                comments,
              }}
            />

            <AddAddressDialog
              key={`address-dialog-${addAddressType}`}
              open={showAddAddress}
              onOpenChange={(open) => setShowAddAddress(open)}
              onSave={async (address) => {
                if (!user?.id) return;

                try {
                  // Store current selections to preserve them
                  const currentSourceIdx = fromAddressIdx;
                  const currentDestIdx = toAddressIdx;
                  const currentSourceData = userLocations[currentSourceIdx];
                  const currentDestData =
                    toAddressIdx >= 0 ? userLocations[currentDestIdx] : null;

                  // Fetch updated locations list
                  const res = await fetch(
                    `/api/user/addresses?userId=${user.id}`,
                  );
                  const data = await res.json();

                  if (Array.isArray(data.locations)) {
                    setUserLocations(data.locations);

                    // Find the newly added address
                    const newAddressIdx = data.locations.findIndex(
                      (loc: { street?: string; postalCode?: string }) =>
                        loc.street === address.street &&
                        loc.postalCode === address.postalCode,
                    );
                    const finalNewIdx =
                      newAddressIdx !== -1
                        ? newAddressIdx
                        : data.locations.length - 1;

                    if (addAddressType === "source") {
                      // Set the new source address
                      setFromAddressIdx(finalNewIdx);
                      setSourceType("my");
                      setFrom(address.country || "");
                      setFromAddress(address.street || "");
                      setFromPostalCode(address.postalCode || "");

                      // Preserve destination if it was already set and still exists
                      if (currentDestData && toAddressIdx >= 0) {
                        const destStillExists = data.locations.findIndex(
                          (loc: { street?: string; postalCode?: string }) =>
                            loc.street === currentDestData.street &&
                            loc.postalCode === currentDestData.postalCode,
                        );
                        if (destStillExists !== -1) {
                          setToAddressIdx(destStillExists);
                        }
                      }
                    } else {
                      // Set the new destination address
                      setToAddressIdx(finalNewIdx);
                      setDestType("my");
                      setTo(address.country || "");
                      setToAddress(address.street || "");
                      setToPostalCode(address.postalCode || "");

                      // Preserve source if it was already set and still exists
                      if (currentSourceData) {
                        const sourceStillExists = data.locations.findIndex(
                          (loc: { street?: string; postalCode?: string }) =>
                            loc.street === currentSourceData.street &&
                            loc.postalCode === currentSourceData.postalCode,
                        );
                        if (sourceStillExists !== -1) {
                          setFromAddressIdx(sourceStillExists);
                        }
                      }
                    }
                  }
                } catch (error) {
                  console.error("Error updating addresses:", error);
                  toast.error("Failed to update address list");
                }
              }}
              type={addAddressType}
              userName={user?.name || ""}
              userId={user?.id || ""}
            />

            {/* Image Zoom Modal */}
            {showImageZoom && selectedImageUrl && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                onClick={() => {
                  setShowImageZoom(false);
                  setSelectedImageUrl(null);
                }}
              >
                <div
                  className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={selectedImageUrl}
                    alt="Zoomed image"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setShowImageZoom(false);
                      setSelectedImageUrl(null);
                    }}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-gray-900/50 hover:bg-gray-900 text-white transition-colors cursor-pointer"
                    aria-label="Close zoomed image"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <p className="absolute bottom-4 left-4 right-4 text-center text-sm text-gray-300">
                    Click outside or press ESC to close
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
