"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { countries } from "@/constants/countries";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false });

interface Address {
  country: string;
  countryCode: string;
  street: string;
  building: string;
  city: string;
  district: string;
  governorate: string;
  postalCode: string;
  landmark: string;
  addressType: string;
  deliveryInstructions?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface AddressFormProps {
  value: Address;
  onChange: (address: Address) => void;
  isOptional?: boolean;
}

const countryCodesMap: { [key: string]: string } = {
  Egypt: "+20",
  "United States": "+1",
  "United Kingdom": "+44",
  Germany: "+49",
  France: "+33",
  Italy: "+39",
  Spain: "+34",
  Canada: "+1",
  Australia: "+61",
  India: "+91",
  China: "+86",
  Japan: "+81",
  Brazil: "+55",
  Mexico: "+52",
};

export default function AddressForm({
  value,
  onChange,
  isOptional = true,
}: AddressFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const handleCountryChange = (country: string) => {
    const code = countryCodesMap[country] || "";
    onChange({
      ...value,
      country,
      countryCode: code,
    });
  };

  const handleMapSelect = (lat: number, lon: number, address: any) => {
    onChange({
      ...value,
      country: address.country || value.country,
      city: address.city || value.city,
      street: address.road || address.street || value.street,
      postalCode: address.postcode || value.postalCode,
      coordinates: {
        latitude: lat,
        longitude: lon,
      },
    });
    setShowMap(false);
  };

  const handleFieldChange = (field: keyof Address, val: string) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-muted hover:bg-muted/80 transition-colors"
      >
        <span className="font-medium text-foreground">
          Address {!isOptional && "(Required)"}
        </span>
        <ChevronDown
          className={`w-5 h-5 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-background">
          {/* Map Picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Location on Map
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMap(!showMap)}
              className="w-full"
            >
              {showMap ? "Hide Map" : "Show Map"}
            </Button>
            {showMap && (
              <div className="mt-2 h-64 rounded-lg overflow-hidden border border-border">
                <MapPicker onSelect={handleMapSelect} />
              </div>
            )}
            {value.coordinates && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {value.coordinates.latitude.toFixed(4)},
                {value.coordinates.longitude.toFixed(4)}
              </p>
            )}
          </div>

          {/* Country and Country Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Country {!isOptional && "*"}
              </label>
              <Select value={value.country} onValueChange={handleCountryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Country Code
              </label>
              <Input
                type="text"
                placeholder="+20"
                value={value.countryCode}
                readOnly
                disabled
              />
            </div>
          </div>

          {/* Street and Building */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Street {!isOptional && "*"}
              </label>
              <Input
                type="text"
                placeholder="e.g., Main Street"
                value={value.street}
                onChange={(e) => handleFieldChange("street", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Building
              </label>
              <Input
                type="text"
                placeholder="e.g., Building A, Floor 5"
                value={value.building}
                onChange={(e) => handleFieldChange("building", e.target.value)}
              />
            </div>
          </div>

          {/* City and District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                City {!isOptional && "*"}
              </label>
              <Input
                type="text"
                placeholder="e.g., Cairo"
                value={value.city}
                onChange={(e) => handleFieldChange("city", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                District
              </label>
              <Input
                type="text"
                placeholder="e.g., Downtown"
                value={value.district}
                onChange={(e) => handleFieldChange("district", e.target.value)}
              />
            </div>
          </div>

          {/* Governorate and Postal Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Governorate
              </label>
              <Input
                type="text"
                placeholder="e.g., Cairo"
                value={value.governorate}
                onChange={(e) =>
                  handleFieldChange("governorate", e.target.value)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Postal Code {!isOptional && "*"}
              </label>
              <Input
                type="text"
                placeholder="e.g., 12345"
                value={value.postalCode}
                onChange={(e) =>
                  handleFieldChange("postalCode", e.target.value)
                }
              />
            </div>
          </div>

          {/* Landmark */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Landmark
            </label>
            <Input
              type="text"
              placeholder="e.g., Near Central Park, Next to the mosque"
              value={value.landmark}
              onChange={(e) => handleFieldChange("landmark", e.target.value)}
            />
          </div>

          {/* Address Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Address Type
            </label>
            <Select
              value={value.addressType}
              onValueChange={(val) => handleFieldChange("addressType", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select address type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Home">Home</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Delivery Instructions */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Delivery Instructions
            </label>
            <Input
              type="text"
              placeholder="e.g., Ring bell twice, leave with receptionist"
              value={value.deliveryInstructions || ""}
              onChange={(e) =>
                handleFieldChange("deliveryInstructions", e.target.value)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
