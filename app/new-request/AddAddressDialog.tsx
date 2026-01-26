import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { countries } from "@/constants/countries";

interface Address {
  country: string;
  countryCode: string;
  fullName: string;
  mobile: string;
  street: string;
  building: string;
  city: string;
  district: string;
  governorate: string;
  postalCode: string;
  landmark: string;
  addressType: string;
  deliveryInstructions: string;
  primary: boolean;
}

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
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type: inputType, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: inputType === "checkbox" ? checked : value,
    }));
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
      const response = await fetch("/api/user/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, address: form }),
      });
      if (!response.ok) {
        throw new Error("Failed to save address");
      }
      const savedAddress = await response.json();
      onSave(savedAddress);
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
          {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
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
