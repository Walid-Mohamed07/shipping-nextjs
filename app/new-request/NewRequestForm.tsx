"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import AddAddressDialog from "./AddAddressDialog";
import ReviewModal from "./ReviewModal";
import type { ReviewData } from "./ReviewModal";
import { useRouter } from "next/navigation";
import type { Item, Address, DayOfWeek } from "@/types";
import { useToast, getErrorMessage } from "@/lib/useToast";
import { useTranslation } from "@/app/context/LocaleContext";
import { useCurrency } from "@/app/context/CurrencyContext";

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
  Pencil,
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
  const toast = useToast();
  const { t, locale } = useTranslation();
  const { formatPrice } = useCurrency();
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
  // Get user's locations (addresses) - fetched from Address collection
  const [userLocations, setUserLocations] = useState<any[]>([]);
  // Fetch latest locations from API
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/user/addresses?userId=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.addresses)) {
            // Sort addresses with primary first
            const sortedAddresses = data.addresses.sort((a: any, b: any) => {
              if (a.primary) return -1;
              if (b.primary) return 1;
              return 0;
            });
            setUserLocations(sortedAddresses);
          }
        })
        .catch((err) => console.error("Failed to fetch addresses:", err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Fetch categories and cost criteria
  const [dynamicCategories, setDynamicCategories] = useState<
    { value: string; label: string }[]
  >([]);
  const [costCriteria, setCostCriteria] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const catRes = await fetch("/api/admin/categories");
        if (catRes.ok) {
          const catData = await catRes.json();
          const cats = (catData.categories || [])
            .map((cat: any) => {
              // Support bilingual name object
              if (cat.name && typeof cat.name === "object") {
                const label =
                  locale === "ar"
                    ? cat.name.ar || cat.name.en
                    : cat.name.en || cat.name.ar;
                // Use English name as value for consistent storage
                return {
                  value: cat.name.en || cat.name.ar || "",
                  label: label || "",
                };
              }
              return { value: cat.name, label: cat.name };
            })
            .filter((c: any) => c.value);
          setDynamicCategories(cats);
        }

        // Fetch cost criteria
        const costRes = await fetch("/api/admin/cost-criteria");
        if (costRes.ok) {
          const costData = await costRes.json();
          setCostCriteria(costData.costCriteria);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic data:", err);
      }
    };

    fetchData();
  }, [locale]);

  const primaryLocation =
    userLocations.length > 0
      ? userLocations.find((loc: any) => loc.primary) || userLocations[0]
      : {};

  // Source address state
  const [fromAddressIdx, setFromAddressIdx] = useState(0); // index in userLocations
  const [from, setFrom] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [fromPostalCode, setFromPostalCode] = useState("");

  // Destination address state
  const [toAddressIdx, setToAddressIdx] = useState(-1); // -1 means not using saved address
  const [to, setTo] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toPostalCode, setToPostalCode] = useState("");

  // Initialize source address from primary location when userLocations loads
  useEffect(() => {
    if (userLocations.length > 0 && !from && !fromAddress) {
      const primary =
        userLocations.find((loc: any) => loc.primary) || userLocations[0];
      if (primary) {
        setFrom(primary.country || "");
        setFromAddress(primary.street || "");
        setFromPostalCode(primary.postalCode || "");
        setFromAddressIdx(userLocations.indexOf(primary));
        setMobile(primary.mobile || user?.mobile || "");
      }
    }
  }, [userLocations, from, fromAddress, user?.mobile]);

  // Clear destination when source address changes
  useEffect(() => {
    setToAddressIdx(-1);
    setTo("");
    setToAddress("");
    setToPostalCode("");
  }, [fromAddressIdx]);

  // Helper to get coords from address (supports Address with coordinates in { latitude, longitude } format)
  const getCoords = (
    loc: {
      coordinates?: { latitude?: number; longitude?: number } | null;
    } | null,
  ) => {
    if (!loc?.coordinates) return null;
    const { latitude, longitude } = loc.coordinates;
    if (latitude == null || longitude == null) return null;
    return { lat: latitude, lng: longitude };
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
    if (toAddressIdx >= 0 && userLocations[toAddressIdx]) {
      return getCoords(userLocations[toAddressIdx] as any);
    }
    const coords = addressForm.coordinates;
    if (coords?.latitude != null && coords?.longitude != null) {
      return { lat: coords.latitude, lng: coords.longitude };
    }
    return null;
  }, [userLocations, toAddressIdx, addressForm.coordinates]);

  // Pickup modes
  const [sourcePickupMode, setSourcePickupMode] = useState("Delegate");
  const [destPickupMode, setDestPickupMode] = useState("Delegate");

  // Modal state for adding/editing address
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addAddressType, setAddAddressType] = useState<
    "source" | "destination"
  >("source");
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Image zoom modal state
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const [items, setItems] = useState<Item[]>([]);
  // Track mediaFiles for each item by index (separate from items array)
  const [itemMediaFilesMap, setItemMediaFilesMap] = useState<
    Record<number, File[]>
  >({});
  // Track preview URLs (blob URLs) for each item for display purposes
  const [itemMediaPreviewsMap, setItemMediaPreviewsMap] = useState<
    Record<number, string[]>
  >({});
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
      assemblyDisassemblyHandler: undefined as "company" | undefined,
      packaging: false,
    },
  });
  // Delivery type: "Normal" | "Urgent"
  const [deliveryType, setDeliveryType] = useState<"Normal" | "Urgent">(
    "Normal",
  );
  // Available days of the week
  const DAYS_OF_WEEK: DayOfWeek[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const [collectionAvailableDays, setCollectionAvailableDays] = useState<
    DayOfWeek[]
  >([]);
  const [deliveryAvailableDays, setDeliveryAvailableDays] = useState<
    DayOfWeek[]
  >([]);
  // Mobile is now per address location, so default to primary location's mobile or user's mobile
  const [mobile, setMobile] = useState("");
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
    // Use cost criteria if available, otherwise fall back to hardcoded rates
    let baseRate = 10; // default fallback

    if (costCriteria && costCriteria.categoryRates) {
      const categoryRate = costCriteria.categoryRates.find(
        (rate: any) => rate.category === category,
      );
      if (categoryRate) {
        baseRate = categoryRate.baseRate;
      }
    } else {
      // Fallback to hardcoded rates
      const hardcodedRates: Record<string, number> = {
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
      baseRate = hardcodedRates[category] ?? 10;
    }

    const weightNum = parseFloat(weight) || 1;
    const weightMultiplier = costCriteria?.weightMultiplier || 1;
    const quantityMultiplier = costCriteria?.quantityMultiplier || 1;
    const sameLocationMultiplier = costCriteria?.sameLocationMultiplier || 1;
    const differentLocationMultiplier =
      costCriteria?.differentLocationMultiplier || 1.5;

    const distanceMultiplier =
      from === to ? sameLocationMultiplier : differentLocationMultiplier;

    return (
      baseRate *
      (weightNum * weightMultiplier) *
      (quantity * quantityMultiplier) *
      distanceMultiplier
    );
  };

  // Apply delivery type surcharge: Fast = configurable surcharge on base cost
  const applyDeliverySurcharge = (baseCost: number) => {
    const surcharge = costCriteria?.urgentDeliverySurcharge || 1.25;
    return deliveryType === "Urgent" ? baseCost * surcharge : baseCost;
  };

  // Apply service fees: Assembly (+20%), Packaging (+10%)
  const applyServiceFees = (baseCost: number) => {
    let cost = baseCost;
    const hasAssembly = items.some(
      (item) => item.services?.assemblyDisassemblyHandler === "company",
    );
    const hasPackaging = items.some((item) => item.services?.packaging);

    if (hasAssembly) {
      cost *= 1.2; // +20% for assembly service
    }
    if (hasPackaging) {
      cost *= 1.1; // +10% for packaging service
    }

    return cost;
  };

  // Primary cost = base cost × delivery surcharge (Fast +25%); recalc when addresses, items, or deliveryType change
  React.useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current as ReturnType<typeof setTimeout>);
    }
    debounceTimeout.current = setTimeout(() => {
      // Check if source and destination addresses are selected
      const sourceSelected =
        fromAddressIdx >= 0 && userLocations[fromAddressIdx];
      const destSelected = toAddressIdx >= 0 && userLocations[toAddressIdx];

      if (sourceSelected && destSelected && items.length > 0) {
        const sourceLocation = userLocations[fromAddressIdx];
        const destLocation = userLocations[toAddressIdx];

        // Calculate total cost for ALL items
        let totalBaseCost = 0;
        let hasValidItems = true;

        for (const item of items) {
          if (!item.category || !item.weight || !item.quantity) {
            hasValidItems = false;
            break;
          }

          const itemCost = calculateCost(
            item.category,
            item.weight,
            item.quantity,
            sourceLocation.country || "",
            destLocation.country || "",
          );
          totalBaseCost += itemCost;
        }

        if (hasValidItems) {
          let primaryCostValue = applyDeliverySurcharge(totalBaseCost);
          // Add service fees
          primaryCostValue = applyServiceFees(primaryCostValue);
          setPrimaryCost(primaryCostValue.toFixed(2));
        } else {
          setPrimaryCost("");
        }
      } else {
        setPrimaryCost("");
      }
    }, 250);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [
    fromAddressIdx,
    toAddressIdx,
    userLocations,
    items,
    deliveryType,
    costCriteria,
  ]);

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

  // Cleanup: Revoke all blob URLs when component unmounts
  useEffect(() => {
    return () => {
      // Revoke all item preview URLs
      Object.values(itemMediaPreviewsMap).forEach((urls) => {
        urls.forEach((url) => URL.revokeObjectURL(url));
      });
      // Revoke new item preview URLs
      newItem.mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []); // Empty deps - only run on unmount

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
    console.log(`Selected files: ${files.map((f) => f.name).join(", ")}`);
    console.log(
      `New media files added: ${toAdd.map((f) => f.name).join(", ")}`,
    );
    console.log(`New Item: ${JSON.stringify(newItem, null, 2)}`);
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
      (dynamicCategories.length > 0
        ? dynamicCategories
        : categories.map((c) => ({ value: c, label: c }))
      ).map((cat) => (
        <SelectItem key={cat.value} value={cat.value}>
          {cat.label}
        </SelectItem>
      )),
    [dynamicCategories],
  );

  const handleDeleteAddress = async (
    addr: { _id?: string; id?: string; street?: string; postalCode?: string },
    context: "source" | "destination",
  ) => {
    if (!user?.id) return;

    // Find location by ID or fallback to street + postalCode lookup
    let addressId = addr._id || addr.id;
    let deletedIdx = -1;

    if (addressId) {
      deletedIdx = userLocations.findIndex(
        (l: any) => l._id === addressId || l.id === addressId,
      );
    } else if (addr.street && addr.postalCode) {
      deletedIdx = userLocations.findIndex(
        (l: any) =>
          l.street === addr.street && l.postalCode === addr.postalCode,
      );
      if (deletedIdx !== -1) {
        addressId =
          userLocations[deletedIdx]?._id || userLocations[deletedIdx]?.id;
      }
    }

    if (!addressId) return;
    if (!confirm(t.newRequest.deleteAddress)) return;

    try {
      const res = await fetch("/api/user/addresses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, addressId }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      const data = await res.json();
      if (Array.isArray(data.addresses)) {
        // Sort addresses with primary first
        const sortedAddresses = data.addresses.sort((a: any, b: any) => {
          if (a.primary) return -1;
          if (b.primary) return 1;
          return 0;
        });
        setUserLocations(sortedAddresses);
        if (context === "source") {
          // Use the first address after deletion/sorting
          setFromAddressIdx(0);
          const sel = sortedAddresses[0];
          setFrom(sel?.country || "");
          setFromAddress(sel?.street || "");
          setFromPostalCode(sel?.postalCode || "");
        } else {
          // Reset destination selection after deletion
          setToAddressIdx(-1);
          setTo("");
          setToAddress("");
          setToPostalCode("");
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
      toast.error(t.newRequest.errSelectSource);
    }

    // Validate destination address
    if (
      !selectedDestLoc ||
      Object.keys(selectedDestLoc).length === 0 ||
      toAddressIdx === -1
    ) {
      errors.destinationAddress = true;
      toast.error(t.newRequest.errSelectDest);
    }

    // Validate items
    if (items.length === 0) {
      errors.items = true;
      toast.error(t.newRequest.errAddItem);
    }

    // Validation for assembly handler removed - now it's a simple checkbox
    const itemsWithMissingHandler = items.filter(
      (item) =>
        item.services?.canBeAssembledDisassembled &&
        !item.services?.assemblyDisassemblyHandler,
    );
    if (itemsWithMissingHandler.length > 0) {
      errors.itemsWithMissingHandler = true;
      toast.error(t.newRequest.errMissingHandler);
    }
    // Validate collection available days (minimum 2 days required)
    if (collectionAvailableDays.length < 2) {
      errors.collectionAvailableDays = true;
      toast.error(t.newRequest.errCollectionDays);
    }

    // Validate collection available days (minimum 2 days required)
    if (collectionAvailableDays.length < 2) {
      errors.collectionAvailableDays = true;
      toast.error(t.newRequest.errCollectionDays);
    }

    // Validate delivery available days (minimum 2 days required)
    if (deliveryAvailableDays.length < 2) {
      errors.deliveryAvailableDays = true;
      toast.error(t.newRequest.errDeliveryDays);
    }

    // Validate mobile
    if (!mobile || mobile.trim() === "") {
      errors.mobile = true;
      toast.error(t.newRequest.errMobile);
    }

    // If there are validation errors, stop submission
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error(t.newRequest.errRequiredFields);
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

    setIsLoading(true);
    let uploadToastId: string | number | undefined;
    try {
      // Check if there are any media files to upload
      const hasMediaFiles = Object.keys(itemMediaFilesMap).some(
        (key) =>
          itemMediaFilesMap[parseInt(key)] &&
          itemMediaFilesMap[parseInt(key)].length > 0,
      );

      if (hasMediaFiles) {
        uploadToastId = toast.loading(t.newRequest.uploadingMedia);
      }

      // Upload media files for items and get URLs
      const formattedItems = await Promise.all(
        items.map(async (item, itemIndex) => {
          let uploadedUrls: string[] = [];

          // Get mediaFiles for this item from the map
          const mediaFiles = itemMediaFilesMap[itemIndex];

          // Upload media files if they exist
          if (mediaFiles && mediaFiles.length > 0) {
            console.log(`[MEDIA UPLOAD] Processing item: ${item.name}`);
            console.log(`[MEDIA UPLOAD] Files count: ${mediaFiles.length}`);

            const formData = new FormData();
            for (const file of mediaFiles) {
              if (file instanceof File) {
                console.log(
                  `[MEDIA UPLOAD] Adding file: ${file.name} (${file.size} bytes, type: ${file.type})`,
                );
                formData.append("files", file);
              }
            }

            try {
              console.log(
                "[MEDIA UPLOAD] Sending request to /api/upload/media",
              );
              const uploadResponse = await fetch("/api/upload/media", {
                method: "POST",
                body: formData,
              });

              console.log(
                `[MEDIA UPLOAD] Response status: ${uploadResponse.status}`,
              );

              if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json().catch(() => ({}));
                console.error("[MEDIA UPLOAD] Upload failed:", errorData);
                throw new Error(
                  errorData.error || "Failed to upload media files",
                );
              }

              const uploadData = await uploadResponse.json();
              uploadedUrls = uploadData.urls || [];
              console.log(
                `[MEDIA UPLOAD] Successfully uploaded. URLs: ${JSON.stringify(uploadedUrls)}`,
              );
            } catch (uploadErr) {
              console.error(
                "[MEDIA UPLOAD] Error occurred:",
                uploadErr instanceof Error ? uploadErr.message : uploadErr,
              );
              // Continue without media - don't fail the entire request
              uploadedUrls = [];
            }
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

      if (uploadToastId) {
        toast.dismiss(uploadToastId);
      }

      const requestBody = {
        user: user?.id,
        source,
        destination,
        items: formattedItems,
        deliveryType,
        collectionAvailableDays:
          collectionAvailableDays.length === 7
            ? ["All Week"]
            : collectionAvailableDays,
        deliveryAvailableDays:
          deliveryAvailableDays.length === 7
            ? ["All Week"]
            : deliveryAvailableDays,
        primaryCost: primaryCost,
        cost: primaryCost,
        requestStatus: "Accepted",
        deliveryStatus: "Pending",
        comment: comments || "",
      };

      console.log(
        "[REQUEST SUBMIT] Formatted items with media:",
        JSON.stringify(
          formattedItems.map((item) => ({
            name: item.name,
            mediaCount: item.media?.length || 0,
            media: item.media,
          })),
          null,
          2,
        ),
      );

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log(`[REQUEST SUBMIT] Response status: ${response.status}`);

      if (!response.ok) {
        const errData = await response.json();
        console.error("[REQUEST SUBMIT] Failed:", errData);
        throw new Error(errData.error || "Failed to create request");
      }

      const responseData = await response.json();
      console.log("[REQUEST SUBMIT] Success:", responseData);

      setSuccess(true);
      setShowReview(false);
      toast.create(t.newRequest.requestCreated);

      // Reset form inputs
      setItems([]);
      setItemMediaFilesMap({});
      // Revoke all remaining preview URLs
      Object.values(itemMediaPreviewsMap).forEach((urls) => {
        urls.forEach((url) => URL.revokeObjectURL(url));
      });
      setItemMediaPreviewsMap({});
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
          assemblyDisassemblyHandler: undefined,
          packaging: false,
        },
      });
      setDeliveryType("Normal");
      setCollectionAvailableDays([]);
      setDeliveryAvailableDays([]);
      setComments("");
      setPrimaryCost("");
      setMobile(primaryLocation.mobile || "");

      // Reset address selections to primary location
      if (userLocations.length > 0) {
        setFromAddressIdx(0);
        const primaryAddr = userLocations[0];
        setFrom(primaryAddr.country || "");
        setFromAddress(primaryAddr.street || "");
        setFromPostalCode(primaryAddr.postalCode || "");
        setMobile(primaryAddr.mobile || user?.mobile || "");
      }
      setToAddressIdx(-1);
      setTo("");
      setToAddress("");
      setToPostalCode("");

      // Reset pickup modes
      setSourcePickupMode("Delegate");
      setDestPickupMode("Delegate");

      setTimeout(() => {
        router.push("/my-requests");
      }, 2000);
    } catch (err) {
      // Dismiss loading toast if it exists
      if (uploadToastId) {
        toast.dismiss(uploadToastId);
      }
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create request";
      setError(errorMessage);
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-600">{t.newRequest.loginToCreate}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg border border-gray-200 mb-6 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t.newRequest.createTitle}
            </h1>
            <p className="text-gray-600 text-sm">
              {t.newRequest.createSubtitle}
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
                      {t.newRequest.requestSubmitted}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {t.newRequest.redirectingToRequests}
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
                        {t.newRequest.sourceOrigin}
                      </h2>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {t.newRequest.sourceSubtitle}
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
                                    {t.newRequest.countryLabel}
                                  </span>{" "}
                                  <span className="text-gray-600">
                                    {loc.country}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900">
                                    {t.newRequest.postalCodeLabel}
                                  </span>{" "}
                                  <span className="text-gray-600">
                                    {loc.postalCode}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900">
                                    {t.newRequest.mobileLabel}
                                  </span>{" "}
                                  <span className="text-gray-600">
                                    {loc.mobile}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900">
                                    {t.newRequest.typeLabel}
                                  </span>{" "}
                                  <span className="text-gray-600">
                                    {loc.addressType}
                                  </span>
                                </div>

                                {loc.landmark && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">
                                      {t.newRequest.landmarkLabel}
                                    </span>{" "}
                                    {loc.landmark}
                                  </div>
                                )}

                                {loc.deliveryInstructions && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">
                                      {t.newRequest.instructionsLabel}
                                    </span>{" "}
                                    {loc.deliveryInstructions}
                                  </div>
                                )}

                                {loc.building && (
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">
                                      {t.newRequest.buildingLabel}
                                    </span>{" "}
                                    {loc.building}
                                  </div>
                                )}

                                {loc.primary && (
                                  <div className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded mt-2">
                                    ⭐ {t.newRequest.primaryLabel}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingAddress(loc);
                              setAddAddressType("source");
                              setShowAddAddress(true);
                            }}
                            disabled={isLoading}
                            className="h-8 w-8 shrink-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer rounded-lg"
                            aria-label="Edit address"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
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
                        {t.newRequest.addNewAddress}
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
                        key={`source-map-${sourceCoords.lat}-${sourceCoords.lng}`}
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
                          {t.newRequest.destination}
                        </h2>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {t.newRequest.destinationSubtitle}
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
                                {/* Always visible content 2 */}
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
                                        {t.newRequest.countryLabel}
                                      </span>{" "}
                                      <span className="text-gray-600">
                                        {loc.country}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        {t.newRequest.postalCodeLabel}
                                      </span>{" "}
                                      <span className="text-gray-600">
                                        {loc.postalCode}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        {t.newRequest.mobileLabel}
                                      </span>{" "}
                                      <span className="text-gray-600">
                                        {loc.mobile}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-900">
                                        {t.newRequest.typeLabel}
                                      </span>{" "}
                                      <span className="text-gray-600">
                                        {loc.addressType}
                                      </span>
                                    </div>

                                    {loc.landmark && (
                                      <div className="text-xs text-gray-600">
                                        <span className="font-semibold">
                                          {t.newRequest.landmarkLabel}
                                        </span>{" "}
                                        {loc.landmark}
                                      </div>
                                    )}

                                    {loc.deliveryInstructions && (
                                      <div className="text-xs text-gray-600">
                                        <span className="font-semibold">
                                          {t.newRequest.instructionsLabel}
                                        </span>{" "}
                                        {loc.deliveryInstructions}
                                      </div>
                                    )}

                                    {loc.building && (
                                      <div className="text-xs text-gray-600">
                                        <span className="font-semibold">
                                          {t.newRequest.buildingLabel}
                                        </span>{" "}
                                        {loc.building}
                                      </div>
                                    )}

                                    {loc.primary && (
                                      <div className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded mt-2">
                                        ⭐ {t.newRequest.primaryLabel}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </label>

                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingAddress(loc);
                                  setAddAddressType("destination");
                                  setShowAddAddress(true);
                                }}
                                disabled={isLoading}
                                className="h-9 w-9 shrink-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer rounded-xl transition-colors"
                                aria-label="Edit address"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
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
                          {t.newRequest.addNewAddress}
                        </Button>
                      </div>
                    </div>

                    {destCoords && (
                      <div className="mt-5 rounded-lg overflow-hidden border border-gray-200">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <p className="text-xs font-medium text-gray-700">
                            {t.newRequest.destinationLocationOnMap}
                          </p>
                        </div>
                        <LocationMapPicker
                          key={`dest-map-${destCoords.lat}-${destCoords.lng}`}
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
                      {t.newRequest.pickupOptions}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t.newRequest.sourcePickupMode}
                      </label>
                      <select
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={sourcePickupMode}
                        onChange={(e) => setSourcePickupMode(e.target.value)}
                        disabled={isLoading}
                        required
                      >
                        <option value="Delegate">
                          {t.newRequest.delegate}
                        </option>
                        <option value="Self">{t.newRequest.self}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {t.newRequest.destinationPickupMode}
                      </label>
                      <select
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={destPickupMode}
                        onChange={(e) => setDestPickupMode(e.target.value)}
                        disabled={isLoading}
                        required
                      >
                        <option value="Delegate">
                          {t.newRequest.delegate}
                        </option>
                        <option value="Self">{t.newRequest.self}</option>
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
                    <h2 className="text-lg font-bold text-gray-900">
                      {t.newRequest.contact}
                    </h2>
                  </div>
                  <div>
                    <label
                      htmlFor="mobile"
                      className="block text-sm font-medium text-gray-900 mb-2"
                    >
                      {t.newRequest.mobileNumber}
                    </label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder={t.newRequest.mobileNumberPlaceholder}
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
                          {t.newRequest.shipmentItems}
                        </h2>
                        <p className="text-sm text-gray-600 mt-0.5">
                          {items.length === 0
                            ? t.newRequest.addAtLeastOne
                            : `${items.length} ${items.length !== 1 ? t.newRequest.itemsAddedPlural : t.newRequest.itemsAdded}`}
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
                              {t.newRequest.dimensionsInItem} {itm.dimensions}
                              <span className="mx-1.5">·</span>
                              {itm.weight} kg
                              <span className="mx-1.5">·</span>
                              {t.newRequest.qtyInItem} {itm.quantity}
                            </p>
                            {(itm.services?.assemblyDisassemblyHandler ===
                              "company" ||
                              itm.services?.packaging) && (
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {itm.services?.assemblyDisassemblyHandler ===
                                  "company" && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-amber-300 bg-amber-50 text-amber-700"
                                  >
                                    <Wrench className="w-3 h-3 mr-1" />
                                    {t.newRequest.assemblyCompanyBadge}
                                  </Badge>
                                )}
                                {itm.services?.packaging && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs border-purple-300 bg-purple-50 text-purple-700"
                                  >
                                    <Package className="w-3 h-3 mr-1" />
                                    {t.newRequest.packagingBadge}
                                  </Badge>
                                )}
                              </div>
                            )}
                            {itm.note && (
                              <p className="mt-2 text-xs text-gray-600 italic bg-gray-50 rounded px-2 py-1 inline-block">
                                {t.newRequest.noteLabel} {itm.note}
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
                          {t.newRequest.addNewItem}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t.newRequest.itemName}
                          </label>
                          <Input
                            placeholder={t.newRequest.itemNamePlaceholder}
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
                            {t.newRequest.category}
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
                              <SelectValue
                                placeholder={t.newRequest.selectCategory}
                              />
                            </SelectTrigger>
                            <SelectContent>{categoryOptions}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            {t.newRequest.dimensionsCm}
                          </label>
                          <Input
                            placeholder={t.newRequest.dimensionsPlaceholder}
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
                            {t.newRequest.weightKg}
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
                            {t.newRequest.quantity}
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
                            {t.newRequest.noteOptional}
                          </label>
                          <textarea
                            placeholder={t.newRequest.notePlaceholder}
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
                              {t.newRequest.mediaOptional}
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
                            {t.newRequest.additionalServicesOptional}
                          </label>
                          <div className="space-y-3">
                            {/* Assembly & Disassembly - Single Checkbox */}
                            <label className="flex items-start gap-2 rounded-lg border border-gray-300 p-3 cursor-pointer hover:border-gray-400 hover:bg-gray-50 bg-white">
                              <input
                                type="checkbox"
                                checked={
                                  newItem.services
                                    .assemblyDisassemblyHandler === "company"
                                }
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setNewItem((prev) => ({
                                    ...prev,
                                    services: {
                                      ...prev.services,
                                      assemblyDisassemblyHandler: checked
                                        ? "company"
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
                                    {t.newRequest.assemblyCompany}
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-1 font-medium">
                                  {t.newRequest.assemblyCompanyDesc}
                                </p>
                              </div>
                            </label>

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
                                    {t.newRequest.packagingLabel}
                                  </span>
                                </div>
                                <p className="text-xs text-amber-600 mt-1 font-medium">
                                  {t.newRequest.packagingDesc}
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
                            toast.error(t.newRequest.errItemName);
                          }
                          if (!newItem.category) {
                            errors.itemCategory = true;
                            toast.error(t.newRequest.errItemCategory);
                          }
                          if (!newItem.dimensions) {
                            errors.itemDimensions = true;
                            toast.error(t.newRequest.errItemDimensions);
                          }
                          if (!newItem.weight) {
                            errors.itemWeight = true;
                            toast.error(t.newRequest.errItemWeight);
                          }
                          if (!newItem.quantity) {
                            errors.itemQuantity = true;
                            toast.error(t.newRequest.errItemQuantity);
                          }

                          // Assembly validation removed - now it's optional

                          if (Object.keys(errors).length > 0) {
                            setItemValidationErrors(errors);
                            toast.error(t.newRequest.errRequiredItemFields);
                            return;
                          }

                          // Create new item with proper structure
                          const newItemObj: Item = {
                            name: newItem.name,
                            category: newItem.category,
                            dimensions: newItem.dimensions,
                            weight: newItem.weight,
                            quantity: newItem.quantity,
                            note: newItem.note.trim() || undefined,
                            media: [], // Will be populated after file upload
                            services: {
                              assemblyDisassemblyHandler:
                                newItem.services.assemblyDisassemblyHandler,
                              packaging: newItem.services.packaging,
                            },
                          };

                          // Store mediaFiles and preview URLs separately by item index
                          const itemIndex = items.length;
                          if (newItem.mediaFiles.length > 0) {
                            setItemMediaFilesMap((prev) => ({
                              ...prev,
                              [itemIndex]: newItem.mediaFiles,
                            }));
                            // Store preview URLs (blob URLs) for display until upload
                            setItemMediaPreviewsMap((prev) => ({
                              ...prev,
                              [itemIndex]: newItem.mediaPreviews,
                            }));
                          }

                          setItems([...items, newItemObj]);
                          toast.create(t.newRequest.itemAddedSuccess);
                          // Don't revoke blob URLs here - they're needed for preview display
                          // They will be revoked when item is deleted or form is reset
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
                              assemblyDisassemblyHandler: undefined,
                              packaging: false,
                            },
                          });
                        }}
                        disabled={isLoading}
                        className="w-full sm:w-auto gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 px-6 rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                        {t.newRequest.addItemBtn}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Item list */}
                  {items.length > 0 && (
                    <div className="space-y-3 mt-5">
                      {items.map((itm, idx) => (
                        <div
                          key={idx}
                          className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-gray-400 hover:bg-gray-50"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                            {idx + 1}
                          </div>
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-50 flex items-center justify-center">
                            <img
                              src={
                                itemMediaPreviewsMap[idx]?.[0] ||
                                itm.media?.[0]?.url ||
                                "/assets/images/items/ShipHub_logo.png"
                              }
                              alt={itm.name}
                              className="h-12 w-12 object-cover rounded-md"
                            />
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
                                      : " (Delegate)"}
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
                            onClick={() => {
                              const newItems = items.filter(
                                (_, i) => i !== idx,
                              );
                              setItems(newItems);

                              // Update mediaFiles map: remove deleted item and reindex remaining items
                              setItemMediaFilesMap((prev) => {
                                const newMap: Record<number, File[]> = {};
                                let newIndex = 0;
                                Object.entries(prev).forEach(
                                  ([oldIndex, files]) => {
                                    const oldIndexNum = parseInt(oldIndex);
                                    // Skip the deleted item's files
                                    if (oldIndexNum !== idx) {
                                      // If this item comes after the deleted one, shift its index down
                                      if (oldIndexNum > idx) {
                                        newMap[oldIndexNum - 1] = files;
                                      } else {
                                        newMap[oldIndexNum] = files;
                                      }
                                    }
                                  },
                                );
                                return newMap;
                              });
                            }}
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
                </section>

                {/* ——— Section 4: Delivery & Cost ——— */}
                <section className="rounded-lg border border-gray-200 bg-white p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
                      4
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {t.newRequest.deliveryCost}
                    </h2>
                  </div>

                  <div className="space-y-6">
                    {/* Delivery Type Card */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        {t.newRequest.deliveryType}{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={deliveryType}
                        onChange={(e) =>
                          setDeliveryType(e.target.value as "Normal" | "Urgent")
                        }
                        disabled={isLoading}
                      >
                        <option value="Normal">
                          🚚 {t.newRequest.normalDelivery}
                        </option>
                        <option value="Urgent">
                          ⚡ {t.newRequest.urgentDelivery}
                        </option>
                      </select>
                      <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {t.newRequest.urgentSurchargeNote}
                      </p>
                    </div>

                    {/* Primary Cost Display */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <label className="block text-sm font-semibold text-gray-900 mb-3">
                        {t.newRequest.estimatedPrimaryCost}
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="text-3xl font-bold text-blue-600">
                            {primaryCost
                              ? formatPrice(Number(primaryCost), "USD")
                              : t.newRequest.calculating}
                          </div>
                          {deliveryType === "Urgent" && primaryCost && (
                            <p className="text-xs text-amber-700 mt-1.5 font-medium flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                              {t.newRequest.includesUrgentSurcharge}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Collection Available Days */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-900">
                          {t.newRequest.collectionAvailableDays}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (collectionAvailableDays.length === 7) {
                              setCollectionAvailableDays([]);
                            } else {
                              setCollectionAvailableDays([...DAYS_OF_WEEK]);
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          {collectionAvailableDays.length === 7
                            ? t.newRequest.clearAll
                            : t.newRequest.selectAllDays}
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        {t.newRequest.collectionDaysRequired}
                      </p>
                      <div
                        className={`grid grid-cols-7 gap-2 ${validationErrors.collectionAvailableDays ? "p-2 border-2 border-red-300 rounded-lg bg-red-50" : ""}`}
                      >
                        {DAYS_OF_WEEK.map((day) => {
                          const isSelected =
                            collectionAvailableDays.includes(day);
                          const shortDay = day.slice(0, 3);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setCollectionAvailableDays(
                                    collectionAvailableDays.filter(
                                      (d) => d !== day,
                                    ),
                                  );
                                } else {
                                  setCollectionAvailableDays([
                                    ...collectionAvailableDays,
                                    day,
                                  ]);
                                }
                              }}
                              disabled={isLoading}
                              className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-green-600 bg-green-50 text-green-700"
                                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <span className="text-xs font-bold uppercase">
                                {shortDay}
                              </span>
                              <span className="text-[10px] mt-0.5 opacity-70">
                                {day}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`text-xs font-medium ${collectionAvailableDays.length >= 2 ? "text-green-600" : "text-amber-600"}`}
                        >
                          {collectionAvailableDays.length}{" "}
                          {collectionAvailableDays.length !== 1
                            ? t.newRequest.daysSelectedPlural
                            : t.newRequest.daysSelected}
                        </span>
                        {collectionAvailableDays.length < 2 && (
                          <span className="text-xs text-red-500">
                            {t.newRequest.needAtLeast2}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delivery Available Days */}
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-900">
                          {t.newRequest.deliveryAvailableDays}{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (deliveryAvailableDays.length === 7) {
                              setDeliveryAvailableDays([]);
                            } else {
                              setDeliveryAvailableDays([...DAYS_OF_WEEK]);
                            }
                          }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          {deliveryAvailableDays.length === 7
                            ? t.newRequest.clearAll
                            : t.newRequest.selectAllDays}
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        {t.newRequest.deliveryDaysRequired}
                      </p>
                      <div
                        className={`grid grid-cols-7 gap-2 ${validationErrors.deliveryAvailableDays ? "p-2 border-2 border-red-300 rounded-lg bg-red-50" : ""}`}
                      >
                        {DAYS_OF_WEEK.map((day) => {
                          const isSelected =
                            deliveryAvailableDays.includes(day);
                          const shortDay = day.slice(0, 3);
                          return (
                            <button
                              key={`delivery-${day}`}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setDeliveryAvailableDays(
                                    deliveryAvailableDays.filter(
                                      (d) => d !== day,
                                    ),
                                  );
                                } else {
                                  setDeliveryAvailableDays([
                                    ...deliveryAvailableDays,
                                    day,
                                  ]);
                                }
                              }}
                              disabled={isLoading}
                              className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50 text-blue-700"
                                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              <span className="text-xs font-bold uppercase">
                                {shortDay}
                              </span>
                              <span className="text-[10px] mt-0.5 opacity-70">
                                {day}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`text-xs font-medium ${deliveryAvailableDays.length >= 2 ? "text-green-600" : "text-amber-600"}`}
                        >
                          {deliveryAvailableDays.length}{" "}
                          {deliveryAvailableDays.length !== 1
                            ? t.newRequest.daysSelectedPlural
                            : t.newRequest.daysSelected}
                        </span>
                        {deliveryAvailableDays.length < 2 && (
                          <span className="text-xs text-red-500">
                            {t.newRequest.needAtLeast2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* ——— Comments Section ——— */}
                <section className="rounded-lg border border-gray-200 bg-white p-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {t.newRequest.commentsOptional}
                  </label>
                  <textarea
                    placeholder={t.newRequest.commentsPlaceholder}
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
                        {t.newRequest.creating}
                      </>
                    ) : (
                      <span>{t.newRequest.reviewSubmit}</span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                    className="flex-1 cursor-pointer border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white font-medium h-12 rounded-lg"
                  >
                    {t.common.cancel}
                  </Button>
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
                    collectionAvailableDays,
                    deliveryAvailableDays,
                    mobile,
                    primaryCost,
                    comments,
                  }}
                />

                <AddAddressDialog
                  key={`address-dialog-${addAddressType}-${editingAddress?.id || "new"}`}
                  open={showAddAddress}
                  onOpenChange={(open) => {
                    setShowAddAddress(open);
                    if (!open) setEditingAddress(null);
                  }}
                  editAddress={editingAddress}
                  onSave={async (address) => {
                    if (!user?.id) return;

                    try {
                      // Store current selections to preserve them
                      const currentSourceIdx = fromAddressIdx;
                      const currentDestIdx = toAddressIdx;
                      const currentSourceData = userLocations[currentSourceIdx];
                      const currentDestData =
                        toAddressIdx >= 0
                          ? userLocations[currentDestIdx]
                          : null;

                      // Fetch updated locations list
                      const res = await fetch(
                        `/api/user/addresses?userId=${user.id}`,
                      );
                      const data = await res.json();

                      if (Array.isArray(data.addresses)) {
                        // Sort addresses with primary first
                        const sortedAddresses = data.addresses.sort((a: any, b: any) => {
                          if (a.primary) return -1;
                          if (b.primary) return 1;
                          return 0;
                        });
                        setUserLocations(sortedAddresses);

                        // Find the newly added address
                        const newAddressIdx = sortedAddresses.findIndex(
                          (loc: { street?: string; postalCode?: string }) =>
                            loc.street === address.street &&
                            loc.postalCode === address.postalCode,
                        );
                        const finalNewIdx =
                          newAddressIdx !== -1
                            ? newAddressIdx
                            : sortedAddresses.length - 1;

                        if (addAddressType === "source") {
                          // Set the new source address
                          setFromAddressIdx(finalNewIdx);
                          setSourceType("my");
                          setFrom(address.country || "");
                          setFromAddress(address.street || "");
                          setFromPostalCode(address.postalCode || "");

                          // Preserve destination if it was already set and still exists
                          if (currentDestData && toAddressIdx >= 0) {
                            const destStillExists = sortedAddresses.findIndex(
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
                            const sourceStillExists = sortedAddresses.findIndex(
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
                      // Clear editing state after successful save
                      setEditingAddress(null);
                    } catch (error) {
                      console.error("Error updating addresses:", error);
                      toast.error(t.newRequest.errUpdateAddressList);
                    }
                  }}
                  type={addAddressType}
                  userName={user?.fullName || ""}
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
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
