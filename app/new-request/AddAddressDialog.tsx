"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { countries, countryPhoneCodes } from "@/constants/countries";
import { Address } from "@/types";
import { MapPinned, Navigation } from "lucide-react";
import { toast } from "sonner";
import type { AddressData } from "@/app/components/LocationMapPicker";

// Formatting utility functions
const formatters = {
  // Capitalize first letter of each word
  capitalizeWords: (str: string) => {
    if (!str) return "";
    return str
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  },
  // Trim whitespace
  trim: (str: string) => str.trim(),
  // Format phone number - clean and normalize (used on save/blur only)
  formatPhone: (str: string) => {
    if (!str) return "";
    // Remove all non-digit characters except + at the start
    let cleaned = str.replace(/[^\d+]/g, "");
    // Ensure only one + at the start
    if (cleaned.includes("+")) {
      const plusCount = (cleaned.match(/\+/g) || []).length;
      if (plusCount > 1 || (plusCount === 1 && !cleaned.startsWith("+"))) {
        cleaned = cleaned.replace(/\+/g, "");
        cleaned = "+" + cleaned;
      }
    }
    // If no + prefix and looks like a local number, add country code
    if (!cleaned.startsWith("+") && cleaned.length >= 9) {
      // Default to international format
      cleaned = "+" + cleaned;
    }
    return cleaned;
  },
  // Validate phone number - must start with + and have 10-15 digits
  validatePhone: (str: string) => {
    if (!str) return false;
    const cleaned = str.replace(/[^\d+]/g, "");
    // Must have at least 10 digits total (including country code)
    const digitsOnly = cleaned.replace(/\D/g, "");
    return digitsOnly.length >= 9 && digitsOnly.length <= 15;
  },
  // Uppercase postal code and trim
  formatPostalCode: (str: string) => {
    if (!str) return "";
    return str.trim().toUpperCase();
  },
  // Remove extra spaces and capitalize
  formatAddress: (str: string) => {
    if (!str) return "";
    return str
      .trim()
      .replace(/\s+/g, " ")
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  },
  // Sanitize inputs - remove dangerous characters (preserves spaces for typing)
  sanitize: (str: string) => {
    if (!str) return "";
    // Remove potentially dangerous characters while allowing common ones
    return str.replace(/[<>{}[\]\\]/g, "");
  },
  // Validate name - only letters, spaces, hyphens, apostrophes
  validateName: (str: string) => {
    if (!str) return false;
    const nameRegex = /^[a-zA-Z\u0600-\u06FF\s'\-\.]+$/;
    return nameRegex.test(str.trim()) && str.trim().length >= 2;
  },
  // Validate street address
  validateStreet: (str: string) => {
    if (!str) return false;
    return str.trim().length >= 3;
  },
};

const LocationMapPicker = dynamic(
  () =>
    import("@/app/components/LocationMapPicker").then(
      (m) => m.LocationMapPicker,
    ),
  { ssr: false },
);

interface AddAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (address: Address) => void;
  type: "source" | "destination";
  userName: string;
  userId?: string;
  editAddress?: Address | null; // Address to edit (if editing mode)
}

export default function AddAddressDialog({
  open,
  onOpenChange,
  onSave,
  type,
  userName,
  userId,
  editAddress,
}: AddAddressDialogProps) {
  const isEditMode = !!editAddress;
  // Initial form state factory function to get fresh state
  const getInitialFormState = () => ({
    country: "",
    countryCode: "",
    fullName: userName || "",
    mobile: "",
    phoneCode: "",
    mobileNumber: "",
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
    warehouseId: "",
    pickupMode: "Self",
    coordinates: undefined as
      | { latitude: number; longitude: number }
      | undefined,
  });

  const [form, setForm] = useState(getInitialFormState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: boolean;
  }>({});
  const [showMap, setShowMap] = useState(false);
  const [mapEditable, setMapEditable] = useState(true);
  // Track which fields user has manually edited (to prevent map overwrites)
  const [userEditedFields, setUserEditedFields] = useState<Set<string>>(new Set());
  // Unique key for map to force remount and prevent container reuse
  const [mapKey, setMapKey] = useState(Date.now());

  // Reset form completely when dialog closes or type changes
  useEffect(() => {
    if (!open) {
      // Completely reset form state when closing
      const timeout = setTimeout(() => {
        setForm(getInitialFormState());
        setShowMap(false);
        setError("");
        setValidationErrors({});
        setLoading(false);
        setMapEditable(true);
        setUserEditedFields(new Set()); // Reset edited fields tracking
        setMapKey(Date.now()); // Reset map key to force fresh mount next time
      }, 200); // Small delay to avoid visual glitch
      return () => clearTimeout(timeout);
    } else if (open && editAddress) {
      // If in edit mode, populate the form with existing address data
      // Split mobile into phoneCode and mobileNumber
      let phoneCode = "";
      let mobileNumber = "";
      if (editAddress.mobile) {
        const match = editAddress.mobile.match(/^(\+\d{1,4})(\d+)$/);
        if (match) {
          phoneCode = match[1];
          mobileNumber = match[2];
        } else {
          mobileNumber = editAddress.mobile.replace(/[^\d]/g, "");
        }
      }
      
      setForm({
        country: editAddress.country || "",
        countryCode: editAddress.countryCode || "",
        fullName: editAddress.fullName || userName || "",
        mobile: editAddress.mobile || "",
        phoneCode: phoneCode,
        mobileNumber: mobileNumber,
        street: editAddress.street || "",
        building: editAddress.building || "",
        city: editAddress.city || "",
        district: editAddress.district || "",
        governorate: editAddress.governorate || "",
        postalCode: editAddress.postalCode || "",
        landmark: editAddress.landmark || "",
        addressType: editAddress.addressType || "Home",
        deliveryInstructions: editAddress.deliveryInstructions || "",
        primary: editAddress.primary || false,
        warehouseId: editAddress.warehouseId || "",
        pickupMode: editAddress.pickupMode || "Self",
        coordinates: editAddress.coordinates,
      });
      if (editAddress.coordinates?.latitude && editAddress.coordinates?.longitude) {
        setShowMap(true);
      }
    }
  }, [open, editAddress, userName]);

  // Update fullName when userName changes (but preserve other fields)
  useEffect(() => {
    if (open && userName) {
      setForm((prev) => ({ ...prev, fullName: userName }));
    }
  }, [userName, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value, type: inputType } = target;
    const checked = (target as HTMLInputElement).checked;
    if (name === "latitude" || name === "longitude") {
      const num = parseFloat(value);
      setForm((prev) => ({
        ...prev,
        coordinates: prev.coordinates
          ? { ...prev.coordinates, [name]: num }
          : { latitude: 0, longitude: 0, [name]: num },
      }));
    } else if (name === "country") {
      // When country changes, update phone code
      const countryCode = countryPhoneCodes[value] || "";
      setForm((prev) => ({
        ...prev,
        country: value,
        countryCode: value,
        phoneCode: countryCode,
      }));
    } else {
      let formattedValue = value;
      // Apply formatting based on field type
      if (inputType !== "checkbox") {
        if (name === "phoneCode") {
          // For phone code, only allow + and digits, ensure + at start
          const cleaned = value.replace(/[^\d+]/g, "");
          if (cleaned === "" || cleaned === "+") {
            formattedValue = cleaned;
          } else {
            // Remove all + and add one at the start
            const digits = cleaned.replace(/\+/g, "");
            formattedValue = "+" + digits;
          }
          // Mark phoneCode as manually edited
          setUserEditedFields((prev) => new Set(prev).add("phoneCode"));
        } else if (name === "mobileNumber") {
          // For mobile number, only allow digits
          formattedValue = value.replace(/[^\d]/g, "");
        } else if (name === "postalCode") {
          formattedValue = formatters.formatPostalCode(value);
        } else if (
          [
            "city",
            "street",
            "building",
            "district",
            "governorate",
            "landmark",
            "fullName",
          ].includes(name)
        ) {
          // Sanitize and format text fields
          formattedValue = formatters.sanitize(value);
          // Mark this field as manually edited by user
          setUserEditedFields((prev) => new Set(prev).add(name));
        } else if (name === "deliveryInstructions") {
          formattedValue = formatters.sanitize(value);
        }
      }
      setForm((prev) => ({
        ...prev,
        [name]: inputType === "checkbox" ? checked : formattedValue,
      }));
    }
  };

  // Handle mobile blur to format the number properly
  const handleMobileBlur = () => {
    // Combine phoneCode and mobileNumber into mobile field
    if (form.phoneCode && form.mobileNumber) {
      const combined = form.phoneCode + form.mobileNumber;
      setForm((prev) => ({ ...prev, mobile: combined }));
    } else if (form.mobileNumber) {
      // If no phone code but has number, add a default +
      const combined = "+" + form.mobileNumber;
      setForm((prev) => ({ ...prev, mobile: combined }));
    }
  };

  const handleSave = async () => {
    // Reset validation errors
    setValidationErrors({});
    const errors: { [key: string]: boolean } = {};

    // Validate userId is available
    if (!userId) {
      setError("User ID is not available. Please refresh the page and try again.");
      toast.error("User ID is not available. Please refresh the page.");
      return;
    }

    // For edit mode, validate that addressId is available
    if (isEditMode && !editAddress?.id) {
      setError("Address ID is not available. Please refresh the page and try again.");
      toast.error("Address ID is not available. Please refresh the page.");
      return;
    }

    // Validate required fields
    if (!form.country) {
      errors.country = true;
      toast.error("Country is required");
    }
    
    // Validate full name
    if (!form.fullName || !formatters.validateName(form.fullName)) {
      errors.fullName = true;
      toast.error("Please enter a valid full name (min 2 characters, letters only)");
    }
    
    // Validate street address
    if (!form.street || !formatters.validateStreet(form.street)) {
      errors.street = true;
      toast.error("Street address is required (min 3 characters)");
    }
    
    // Validate postal code
    if (!form.postalCode || !form.postalCode.trim()) {
      errors.postalCode = true;
      toast.error("Postal code is required");
    }
    
    // Validate mobile number
    if (!form.mobileNumber || form.mobileNumber.length < 8) {
      errors.mobile = true;
      toast.error("Please enter a valid mobile number (at least 8 digits)");
    }
    
    if (!form.phoneCode) {
      errors.phoneCode = true;
      toast.error("Please select or enter a country code");
    }
    
    // Validate city
    if (!form.city || form.city.trim().length < 2) {
      errors.city = true;
      toast.error("City is required");
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError("Please fill in all required fields correctly");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Combine phoneCode and mobileNumber before saving
      const combinedMobile = form.phoneCode + form.mobileNumber;
      
      // Clean and format all fields before saving
      const addressToSave = {
        ...form,
        fullName: formatters.capitalizeWords(form.fullName.trim()),
        street: formatters.formatAddress(form.street.trim()),
        city: formatters.formatAddress(form.city.trim()),
        building: formatters.formatAddress(form.building.trim()),
        district: formatters.formatAddress(form.district.trim()),
        governorate: formatters.formatAddress(form.governorate.trim()),
        postalCode: formatters.formatPostalCode(form.postalCode.trim()),
        mobile: combinedMobile,
        landmark: formatters.formatAddress(form.landmark.trim()),
        deliveryInstructions: formatters.trim(form.deliveryInstructions),
        coordinates:
          form.coordinates?.latitude != null &&
          form.coordinates?.longitude != null
            ? form.coordinates
            : undefined,
      };
      
      // Use PUT for updates, POST for new addresses
      const method = isEditMode ? "PUT" : "POST";
      const requestBody = isEditMode 
        ? { userId, addressId: editAddress?.id, ...addressToSave }
        : { userId, ...addressToSave };
      
      const response = await fetch("/api/user/addresses", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const resData = await response.json();
      
      if (!response.ok) {
        const errorMsg = resData.error || `Failed to ${isEditMode ? "update" : "save"} address`;
        throw new Error(errorMsg);
      }
      const savedAddress = isEditMode 
        ? resData.address 
        : (resData.addresses?.[resData.addresses.length - 1] ?? addressToSave);

      toast.success(`Address ${isEditMode ? "updated" : "saved"} successfully!`);

      // Call parent's onSave callback and wait for it to complete
      await Promise.resolve(onSave(savedAddress as Address));

      setLoading(false);

      // Close dialog after a short delay to ensure state updates complete
      setTimeout(() => {
        onOpenChange(false);
      }, 100);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save address";
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-card p-6 rounded shadow-lg max-w-lg w-full z-50"
          style={{ maxHeight: "90vh", overflowY: "scroll" }}
        >
          <Dialog.Title className="text-lg font-bold mb-4">
            {isEditMode ? "Edit Address" : "Add New Address"} ({type === "source" ? "Source" : "Destination"})
          </Dialog.Title>
          {error && (
            <div className="mb-2 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Location capture - store lat/long for map display */}
          <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30">
            <p className="text-sm font-medium text-foreground mb-2">
              Set location (stored for map display)
            </p>
            {!showMap ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setForm((f) => ({
                            ...f,
                            coordinates: {
                              latitude: pos.coords.latitude,
                              longitude: pos.coords.longitude,
                            },
                          }));
                          setShowMap(true);
                        },
                        () => setError("Could not get location"),
                      );
                    } else {
                      setError("Geolocation not supported");
                    }
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  Use my location
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowMap(true);
                    setMapEditable(true);
                    setMapKey(Date.now()); // Generate new key for fresh map instance
                  }}
                  className="gap-2 cursor-pointer"
                >
                  <MapPinned className="w-4 h-4" />
                  Pick on map
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <LocationMapPicker
                  key={`map-${type}-${mapKey}`}
                  position={
                    form.coordinates
                      ? {
                          lat: form.coordinates.latitude,
                          lng: form.coordinates.longitude,
                        }
                      : null
                  }
                  onPositionChange={(lat, lng) => {
                    // Clear coordinates if 0,0 (clear button was clicked)
                    if (lat === 0 && lng === 0) {
                      setForm((f) => ({ ...f, coordinates: undefined }));
                    } else {
                      setForm((f) => ({
                        ...f,
                        coordinates: { latitude: lat, longitude: lng },
                      }));
                    }
                  }}
                  onAddressData={(addressData: AddressData) => {
                    // Only update fields that user hasn't manually edited
                    setForm((prev) => ({
                      ...prev,
                      street: !userEditedFields.has('street') && addressData.street ? addressData.street : prev.street,
                      city: !userEditedFields.has('city') && addressData.city ? addressData.city : prev.city,
                      district: !userEditedFields.has('district') && addressData.district ? addressData.district : prev.district,
                      governorate: !userEditedFields.has('governorate') && addressData.governorate ? addressData.governorate : prev.governorate,
                      country: addressData.country || prev.country,
                      postalCode: addressData.postalCode || prev.postalCode,
                      // Only update phoneCode if user hasn't manually selected/edited it
                      phoneCode: !userEditedFields.has('phoneCode') && addressData.country && countryPhoneCodes[addressData.country] 
                        ? countryPhoneCodes[addressData.country] 
                        : prev.phoneCode,
                    }));
                  }}
                  editable={mapEditable}
                  onEditableChange={setMapEditable}
                  height={180}
                  showUseMyLocation
                />
                {form.coordinates && (
                  <div className="flex gap-2 flex-wrap">
                    {userEditedFields.size > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUserEditedFields(new Set());
                          toast.success("You can now re-import from map by moving the pin");
                        }}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50 cursor-pointer"
                      >
                        Allow map updates
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowMap(false);
                        setForm((f) => ({ ...f, coordinates: undefined }));
                      }}
                      className="text-muted-foreground cursor-pointer"
                    >
                      Hide map
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 mb-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="fullName"
                placeholder="e.g., Ahmed Hassan"
                value={form.fullName}
                onChange={handleChange}
                required
                className={validationErrors.fullName ? "border-red-500" : ""}
              />
            </div>

            {/* Country Select */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Country <span className="text-red-500">*</span>
              </label>
              <select
                name="country"
                value={form.country}
                onChange={handleChange}
                required
                className={`block w-full rounded border px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary bg-background ${
                  validationErrors.country ? "border-red-500" : "border-border"
                }`}
              >
                <option value="" disabled>
                  Select country
                </option>
                {countries.map((country) => (
                  <option
                    key={country}
                    value={country}
                    className="bg-background text-foreground"
                  >
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* City and Street - Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  name="city"
                  placeholder="e.g., Cairo, Dubai, Riyadh"
                  value={form.city}
                  onChange={handleChange}
                  required
                  className={validationErrors.city ? "border-red-500" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <Input
                  name="postalCode"
                  placeholder="e.g., 12345"
                  value={form.postalCode}
                  onChange={handleChange}
                  required
                  className={validationErrors.postalCode ? "border-red-500" : ""}
                />
              </div>
            </div>

            {/* Street Address */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Street Address <span className="text-red-500">*</span>
              </label>
              <Input
                name="street"
                placeholder="e.g., 123 Main St., Apartment 5"
                value={form.street}
                onChange={handleChange}
                required
                className={validationErrors.street ? "border-red-500" : ""}
              />
            </div>

            {/* Building and District - Grid Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Building / Apt
                </label>
                <Input
                  name="building"
                  placeholder="e.g., Building 5, Apt 12"
                  value={form.building}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  District
                </label>
                <Input
                  name="district"
                  placeholder="e.g., Maadi, Jumeirah"
                  value={form.district}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Governorate */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Governorate / State
              </label>
              <Input
                name="governorate"
                placeholder="e.g., Cairo Governorate"
                value={form.governorate}
                onChange={handleChange}
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {/* Country Code Dropdown */}
                <div className="w-36">
                  <select
                    name="phoneCodeSelect"
                    value={form.phoneCode}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, phoneCode: e.target.value }));
                      // Mark phoneCode as manually edited when selected from dropdown
                      setUserEditedFields((prev) => new Set(prev).add("phoneCode"));
                    }}
                    className={`block w-full h-10 rounded border px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary bg-background cursor-pointer ${
                      validationErrors.phoneCode ? "border-red-500" : "border-border"
                    }`}
                  >
                    <option value="">Select code</option>
                    {countries.map((country) => (
                      <option
                        key={country}
                        value={countryPhoneCodes[country] || ""}
                      >
                        {countryPhoneCodes[country]} - {country}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Phone Number Input */}
                <div className="flex-1">
                  <Input
                    name="mobileNumber"
                    type="tel"
                    placeholder="Enter phone number"
                    value={form.mobileNumber}
                    onChange={handleChange}
                    onBlur={handleMobileBlur}
                    required
                    className={`h-10 ${validationErrors.mobile ? "border-red-500" : ""}`}
                  />
                </div>
              </div>
              {(!form.phoneCode || !form.mobileNumber) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Select country code and enter phone number
                </p>
              )}
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Landmark
              </label>
              <Input
                name="landmark"
                placeholder="e.g., Near City Mall"
                value={form.landmark}
                onChange={handleChange}
              />
            </div>

            {/* Delivery Instructions */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Delivery Instructions
              </label>
              <Input
                name="deliveryInstructions"
                placeholder="e.g., Leave at reception, call on arrival"
                value={form.deliveryInstructions}
                onChange={handleChange}
              />
            </div>

            {/* Address Type Radio */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Address Type
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="addressType"
                    value="Home"
                    checked={form.addressType === "Home"}
                    onChange={handleChange}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">
                    Home{" "}
                    <span className="text-xs text-muted-foreground">
                      (7am-9pm, all days)
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="addressType"
                    value="Office"
                    checked={form.addressType === "Office"}
                    onChange={handleChange}
                    className="cursor-pointer"
                  />
                  <span className="text-sm">
                    Office{" "}
                    <span className="text-xs text-muted-foreground">
                      (9am-6pm, Weekdays)
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Primary Checkbox */}
            <div className="border-t border-border pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="primary"
                  checked={form.primary}
                  onChange={handleChange}
                  className="cursor-pointer"
                />
                <span className="text-sm font-medium">Set as Primary Address</span>
              </label>
              {form.primary && (
                <p className="text-xs text-muted-foreground mt-2 ml-6">
                  This will be your default address for new requests
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : (isEditMode ? "Update Address" : "Save Address")}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
