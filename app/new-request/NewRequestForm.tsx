"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import AddAddressDialog from "./AddAddressDialog";
import { useRouter } from "next/navigation";
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
import { AlertCircle, CheckCircle } from "lucide-react";
import { countries } from "@/constants/countries";

import { categories } from "@/constants/categories";

export default function NewRequestForm() {
  // Warehouses state
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [pickupMode, setPickupMode] = useState("Self");

  // ...existing code...

  // Fetch warehouses on mount
  useEffect(() => {
    fetch("/api/admin/warehouse")
      .then((res) => res.json())
      .then((data) => setWarehouses(data || []));
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
    userLocations.find((loc) => loc.primary) || userLocations[0] || {};

  // Source address state
  const [fromAddressIdx, setFromAddressIdx] = useState(0); // index in userLocations
  const [from, setFrom] = useState(primaryLocation.country || "");
  const [fromAddress, setFromAddress] = useState(primaryLocation.street || "");
  const [fromPostalCode, setFromPostalCode] = useState(
    primaryLocation.postalCode || "",
  );

  // Filter warehouses by selected source country
  const filteredWarehouses = useMemo(
    () => warehouses.filter((w) => w.country === from),
    [warehouses, from],
  );

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
  const [item, setItem] = useState("");
  const [category, setCategory] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [weight, setWeight] = useState("");
  const [quantity, setQuantity] = useState(1);
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
      if (from && to && category && weight && quantity) {
        setEstimatedCost(calculateCost(category, weight, quantity, from, to));
        setEstimatedTime(calculateDeliveryTime(from, to, category));
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
  }, [from, to, category, weight, quantity]);

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
    const sourceCountry =
      sourceType === "my" ? selectedSourceLoc.country : from;
    const sourceAddress =
      sourceType === "my" ? selectedSourceLoc.street : fromAddress;
    const sourcePostalCode =
      sourceType === "my" ? selectedSourceLoc.postalCode : fromPostalCode;
    const destCountry = destType === "my" ? selectedDestLoc.country : to;
    const destAddress = destType === "my" ? selectedDestLoc.street : toAddress;
    const destPostalCode =
      destType === "my" ? selectedDestLoc.postalCode : toPostalCode;
    if (
      !sourceCountry ||
      !sourceAddress ||
      !sourcePostalCode ||
      !destCountry ||
      !destAddress ||
      !destPostalCode ||
      !item ||
      !category ||
      !dimensions ||
      !weight ||
      !quantity ||
      !mobile ||
      !selectedWarehouse
    ) {
      setError("Please fill in all fields");
      return;
    }
    if (
      sourceCountry === destCountry &&
      sourceAddress === destAddress &&
      sourcePostalCode === destPostalCode
    ) {
      setError("Destination must be different from origin");
      return;
    }
    if (!estimatedCost || !estimatedTime) {
      setError(
        "Please ensure all fields are filled to calculate cost and time",
      );
      return;
    }
    setIsLoading(true);
    try {
      // Build the request object with all relevant fields
      const requestBody = {
        userId: user?.id,
        from: selectedSourceLoc,
        to: selectedDestLoc,
        item,
        category,
        dimensions,
        weight,
        quantity,
        address: destAddress,
        country: destCountry,
        postalCode: destPostalCode,
        mobile,
        estimatedCost,
        orderStatus: "Pending",
        deliveryStatus: "Pending",
        estimatedTime,
        sourceAddress,
        sourcePostalCode,
        warehouseId: selectedWarehouse,
        pickupMode,
        // Add any additional fields here as needed
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
      // Optionally, handle the returned request object
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Source (Origin) Section - Radio Group */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Source (Origin)
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
              </div>
              {/* Destination (To) Section - Radio Group */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Destination
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
                  {/* Add Address Dialog Popup */}
                  <AddAddressDialog
                    open={showAddAddress}
                    onOpenChange={(open) => setShowAddAddress(open)}
                    onSave={async (address) => {
                      // After saving, fetch latest locations from API
                      if (user?.id) {
                        const res = await fetch(
                          `/api/user/addresses?userId=${user.id}`,
                        );
                        const data = await res.json();
                        if (Array.isArray(data.locations)) {
                          setUserLocations(data.locations);
                          // Find the new address index
                          const idx = data.locations.findIndex(
                            (loc) =>
                              loc.street === address.street &&
                              loc.postalCode === address.postalCode,
                          );
                          if (addAddressType === "source") {
                            setFromAddressIdx(
                              idx !== -1 ? idx : data.locations.length - 1,
                            );
                            setSourceType("my");
                            setFrom(address.country);
                            setFromAddress(address.street);
                            setFromPostalCode(address.postalCode);
                          } else {
                            setToAddressIdx(
                              idx !== -1 ? idx : data.locations.length - 1,
                            );
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
                      ? "No warehouses available"
                      : "Select a warehouse"}
                  </option>
                  {filteredWarehouses.map((w) => (
                    <option
                      key={w.id}
                      value={w.id}
                      className="bg-background text-foreground"
                    >
                      {w.name || w.id} ({w.city || w.country})
                    </option>
                  ))}
                </select>
              </div>
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
              {/* Mobile Number */}
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
              {/* ...existing code for item, category, dimensions, weight, quantity, estimated cost/time, buttons... */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="item"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Item Description
                  </label>
                  <Input
                    id="item"
                    type="text"
                    placeholder="e.g., Laptop, Clothing Box, etc."
                    value={item}
                    onChange={(e) => setItem(e.target.value)}
                    disabled={isLoading}
                    required
                    style={{ maxWidth: "100%" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Category
                  </label>
                  <Select
                    value={category}
                    onValueChange={setCategory}
                    disabled={isLoading}
                  >
                    <SelectTrigger style={{ width: "100%" }}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>{categoryOptions}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label
                    style={{ maxWidth: "100%" }}
                    htmlFor="dimensions"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Item Dimensions
                  </label>
                  <Input
                    id="dimensions"
                    type="text"
                    placeholder="e.g., 30x20x10 cm"
                    value={dimensions}
                    onChange={(e) => setDimensions(e.target.value)}
                    disabled={isLoading}
                    required
                    style={{ maxWidth: "100%" }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="weight"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Item Weight (kg)
                  </label>
                  <Input
                    id="weight"
                    type="number"
                    min="0.1"
                    step="0.01"
                    placeholder="e.g., 2.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    disabled={isLoading}
                    required
                    style={{ maxWidth: "100%" }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-medium text-foreground mb-2"
                  >
                    Quantity
                  </label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    disabled={isLoading}
                    required
                    style={{ maxWidth: "100%" }}
                  />
                </div>
              </div>
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
