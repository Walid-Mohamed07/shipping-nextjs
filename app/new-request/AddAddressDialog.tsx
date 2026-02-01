"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import * as Dialog from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { countries } from "@/constants/countries";
import { Address } from "@/types";
import { MapPinned, Navigation } from "lucide-react";
import type { AddressData } from "@/app/components/LocationMapPicker";

const LocationMapPicker = dynamic(
  () =>
    import("@/app/components/LocationMapPicker").then((m) => m.LocationMapPicker),
  { ssr: false }
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
  const [form, setForm] = useState({
    country: "",
    countryCode: "",
    fullName: userName,
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
    coordinates: undefined as { latitude: number; longitude: number } | undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [mapEditable, setMapEditable] = useState(true);

  useEffect(() => {
    if (!open) {
      setShowMap(false);
      setForm((f) => ({ ...f, coordinates: undefined }));
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      setForm((prev) => ({
        ...prev,
        [name]: inputType === "checkbox" ? checked : value,
      }));
    }
  };

  const handleSave = async () => {
    // Basic validation
    if (!form.country || !form.street || !form.postalCode || !form.mobile) {
      setError(
        "Please fill in required fields (country, street, postal code, mobile)"
      );
      return;
    }
    setLoading(true);
    try {
      const addressToSave = {
        ...form,
        coordinates: form.coordinates?.latitude != null && form.coordinates?.longitude != null
          ? form.coordinates
          : undefined,
      };
      const response = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, address: addressToSave }),
      });
      if (!response.ok) {
        throw new Error("Failed to save address");
      }
      const resData = await response.json();
      const savedAddress = resData.locations?.[resData.locations.length - 1] ?? addressToSave;
      onSave(savedAddress as Address);
      setLoading(false);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
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
          {error && <div className="mb-2 text-red-600 dark:text-red-400 text-sm">{error}</div>}

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
                      ? { lat: form.coordinates.latitude, lng: form.coordinates.longitude }
                      : null
                  }
                  onPositionChange={(lat, lng) =>
                    setForm((f) => ({ ...f, coordinates: { latitude: lat, longitude: lng } }))
                  }
                  onAddressData={(addressData: AddressData) => {
                    setForm((prev) => ({
                      ...prev,
                      street: addressData.street ?? prev.street,
                      city: addressData.city ?? prev.city,
                      district: addressData.district ?? prev.district,
                      governorate: addressData.governorate ?? prev.governorate,
                      country: addressData.country ?? prev.country,
                      postalCode: addressData.postalCode ?? prev.postalCode,
                    }));
                  }}
                  editable={mapEditable}
                  onEditableChange={setMapEditable}
                  height={180}
                  showUseMyLocation
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMap(false)}
                  className="text-muted-foreground cursor-pointer"
                >
                  Hide map
                </Button>
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
              className="block w-full rounded border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
