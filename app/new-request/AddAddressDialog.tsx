"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { countries } from "@/constants/countries";
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
  // Format phone number - remove all non-digits, then format as international
  formatPhone: (str: string) => {
    if (!str) return "";
    const cleaned = str.replace(/\D/g, "");
    // Keep cleaned version or format with + if it starts with country code
    if (cleaned.startsWith("2")) {
      // Egyptian numbers
      return `+20${cleaned.slice(cleaned.length - 9)}`;
    }
    return cleaned.length > 0 ? `+${cleaned}` : "";
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
}

export default function AddAddressDialog({
  open,
  onOpenChange,
  onSave,
  type,
  userName,
  userId,
}: AddAddressDialogProps) {
  // Initial form state factory function to get fresh state
  const getInitialFormState = () => ({
    country: "",
    countryCode: "",
    fullName: userName || "",
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
      }, 200); // Small delay to avoid visual glitch
      return () => clearTimeout(timeout);
    }
  }, [open]);

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
    } else {
      let formattedValue = value;
      // Apply formatting based on field type
      if (inputType !== "checkbox") {
        if (name === "mobile") {
          formattedValue = formatters.formatPhone(value);
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
          formattedValue = formatters.formatAddress(value);
        } else if (name === "deliveryInstructions") {
          formattedValue = formatters.trim(value);
        }
      }
      setForm((prev) => ({
        ...prev,
        [name]: inputType === "checkbox" ? checked : formattedValue,
      }));
    }
  };

  const handleSave = async () => {
    // Reset validation errors
    setValidationErrors({});
    const errors: { [key: string]: boolean } = {};

    // Validate required fields
    if (!form.country) {
      errors.country = true;
      toast.error("Country is required");
    }
    if (!form.street || !form.street.trim()) {
      errors.street = true;
      toast.error("Street is required");
    }
    if (!form.postalCode || !form.postalCode.trim()) {
      errors.postalCode = true;
      toast.error("Postal code is required");
    }
    if (!form.mobile || !form.mobile.trim()) {
      errors.mobile = true;
      toast.error("Mobile number is required");
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Clean and format all fields before saving
      const addressToSave = {
        ...form,
        fullName: formatters.capitalizeWords(form.fullName),
        street: formatters.formatAddress(form.street),
        city: formatters.formatAddress(form.city),
        building: formatters.formatAddress(form.building),
        district: formatters.formatAddress(form.district),
        governorate: formatters.formatAddress(form.governorate),
        postalCode: formatters.formatPostalCode(form.postalCode),
        mobile: formatters.formatPhone(form.mobile),
        landmark: formatters.formatAddress(form.landmark),
        deliveryInstructions: formatters.trim(form.deliveryInstructions),
        coordinates:
          form.coordinates?.latitude != null &&
          form.coordinates?.longitude != null
            ? form.coordinates
            : undefined,
      };
      const response = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...addressToSave }),
      });
      if (!response.ok) {
        throw new Error("Failed to save address");
      }
      const resData = await response.json();
      const savedAddress =
        resData.addresses?.[resData.addresses.length - 1] ?? addressToSave;

      toast.success("Address saved successfully!");

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
            Add New Address ({type === "source" ? "Source" : "Destination"})
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
                    setForm((prev) => ({
                      ...prev,
                      street: formatters.formatAddress(
                        addressData.street ?? prev.street,
                      ),
                      city: formatters.formatAddress(
                        addressData.city ?? prev.city,
                      ),
                      district: formatters.formatAddress(
                        addressData.district ?? prev.district,
                      ),
                      governorate: formatters.formatAddress(
                        addressData.governorate ?? prev.governorate,
                      ),
                      country: addressData.country ?? prev.country,
                      postalCode: formatters.formatPostalCode(
                        addressData.postalCode ?? prev.postalCode,
                      ),
                    }));
                  }}
                  editable={mapEditable}
                  onEditableChange={setMapEditable}
                  height={180}
                  showUseMyLocation
                />
                {form.coordinates && (
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
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 mb-4">
            {/* Country Select */}
            <label className="block text-sm font-medium text-foreground mb-1">
              Country
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

            <label className="block text-sm font-medium text-foreground mb-1">
              City
            </label>
            <Input
              name="city"
              placeholder="e.g., Cairo, Dubai, Riyadh"
              value={form.city}
              onChange={handleChange}
            />

            <label className="block text-sm font-medium text-foreground mb-1">
              Street
            </label>
            <Input
              name="street"
              placeholder="e.g., 123 Main St."
              value={form.street}
              onChange={handleChange}
              required
              className={validationErrors.street ? "border-red-500" : ""}
            />

            <label className="block text-sm font-medium text-foreground mb-1">
              Building
            </label>
            <Input
              name="building"
              placeholder="e.g., Building 5, Apt 12"
              value={form.building}
              onChange={handleChange}
            />

            <label className="block text-sm font-medium text-foreground mb-1">
              District
            </label>
            <Input
              name="district"
              placeholder="e.g., Maadi, Jumeirah"
              value={form.district}
              onChange={handleChange}
            />

            <label className="block text-sm font-medium text-foreground mb-1">
              Governorate
            </label>
            <Input
              name="governorate"
              placeholder="e.g., Cairo Governorate"
              value={form.governorate}
              onChange={handleChange}
            />

            <label className="block text-sm font-medium text-foreground mb-1">
              Postal Code
            </label>
            <Input
              name="postalCode"
              placeholder="e.g., 12345"
              value={form.postalCode}
              onChange={handleChange}
              required
              className={validationErrors.postalCode ? "border-red-500" : ""}
            />

            <label className="block text-sm font-medium text-foreground mb-1">
              Mobile
            </label>
            <Input
              name="mobile"
              placeholder="e.g., +201234567890"
              value={form.mobile}
              onChange={handleChange}
              required
              className={validationErrors.mobile ? "border-red-500" : ""}
            />

            <label className="block text-sm font-medium text-foreground mb-1">
              Landmark
            </label>
            <Input
              name="landmark"
              placeholder="e.g., Near City Mall"
              value={form.landmark}
              onChange={handleChange}
            />

            <label className="block text-sm font-medium text-foreground mb-1">
              Delivery Instructions
            </label>
            <Input
              name="deliveryInstructions"
              placeholder="e.g., Leave at reception, call on arrival"
              value={form.deliveryInstructions}
              onChange={handleChange}
            />

            {/* Address Type Radio */}
            <label className="block text-sm font-medium text-foreground mb-1">
              Address Type
            </label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="addressType"
                  value="Home"
                  checked={form.addressType === "Home"}
                  onChange={handleChange}
                />
                <span>
                  Home{" "}
                  <span className="text-xs text-muted-foreground">
                    (7am-9pm, all days)
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="addressType"
                  value="Office"
                  checked={form.addressType === "Office"}
                  onChange={handleChange}
                />
                <span>
                  Office{" "}
                  <span className="text-xs text-muted-foreground">
                    (9am-6pm, Weekdays)
                  </span>
                </span>
              </label>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="primary"
                checked={form.primary}
                onChange={handleChange}
              />
              <span>Set as Primary</span>
            </label>
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
              {loading ? "Saving..." : "Save Address"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
