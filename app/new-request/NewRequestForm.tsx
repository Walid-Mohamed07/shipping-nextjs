"use client";

import React, { useRef, useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
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
  const userLocations = user?.locations || [];
  const primaryLocation =
    userLocations.find((loc) => loc.primary) || userLocations[0] || {};

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

  // Modal state for adding/editing address
  const [showAddAddress, setShowAddAddress] = useState(false);
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
      !mobile
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
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          from: sourceCountry,
          to: destCountry,
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
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create request");
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
              {/* Source (From) Section */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Source (Origin)
                </label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sourceType"
                      value="my"
                      checked={sourceType === "my"}
                      onChange={() => {
                        setSourceType("my");
                        setFrom(userLocations[fromAddressIdx]?.country || "");
                        setFromAddress(
                          userLocations[fromAddressIdx]?.street || "",
                        );
                        setFromPostalCode(
                          userLocations[fromAddressIdx]?.postalCode || "",
                        );
                        if (destType === "my") setDestType("other");
                      }}
                      disabled={isLoading || destType === "my"}
                    />
                    My Address
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="sourceType"
                      value="other"
                      checked={sourceType === "other"}
                      onChange={() => {
                        setSourceType("other");
                        setFrom("");
                        setFromAddress("");
                        setFromPostalCode("");
                      }}
                      disabled={isLoading}
                    />
                    Other
                  </label>
                  {sourceType === "my" && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="ml-4"
                        onClick={() => setShowSelectAddress(true)}
                        disabled={isLoading}
                      >
                        Select Address
                      </Button>
                      <Dialog.Root
                        open={!!showSelectAddress}
                        onOpenChange={setShowSelectAddress}
                      >
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
                          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
                            <Dialog.Title className="text-lg font-bold mb-4">
                              Select Destination Address
                            </Dialog.Title>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {userLocations.length === 0 && (
                                <div className="text-muted-foreground text-sm">
                                  No saved addresses.
                                </div>
                              )}
                              {userLocations.map((loc, idx) => (
                                <div
                                  key={idx}
                                  className={`border rounded p-3 mb-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition ${
                                    toAddressIdx === idx
                                      ? "border-primary bg-card"
                                      : "border-border"
                                  }`}
                                  onClick={() => {
                                    setToAddressIdx(idx);
                                    setTo(loc.country || "");
                                    setToAddress(loc.street || "");
                                    setToPostalCode(loc.postalCode || "");
                                    setShowSelectAddress(false);
                                  }}
                                >
                                  <div className="font-medium">
                                    {loc.fullName}
                                    {<br />}
                                    {loc.street}, {loc.city}
                                  </div>
                                  <div className="text-xs">
                                    {loc.country} • {loc.postalCode} •{" "}
                                    {loc.addressType}
                                    {loc.primary ? " [Primary]" : ""}
                                  </div>
                                  <div className="text-xs">{loc.mobile}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-end mt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowSelectAddress(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                      <Button
                        type="button"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          setIsEditingAddress(false);
                          setEditAddressIdx(null);
                          setAddressForm({
                            country: "",
                            countryCode: "",
                            fullName: user?.name || "",
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
                          setShowAddAddress(true);
                        }}
                      >
                        Add new address
                      </Button>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Country
                    </label>
                    <Select
                      value={from}
                      onValueChange={setFrom}
                      disabled={isLoading || sourceType === "my"}
                    >
                      <SelectTrigger style={{ maxWidth: "100%" }}>
                        <SelectValue placeholder="Select origin country" />
                      </SelectTrigger>
                      <SelectContent>{countryOptions}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Address
                    </label>
                    <Input
                      id="fromAddress"
                      type="text"
                      placeholder="Origin address"
                      value={fromAddress}
                      onChange={(e) => setFromAddress(e.target.value)}
                      disabled={isLoading || sourceType === "my"}
                      required
                      style={{ maxWidth: "100%" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Postal Code
                    </label>
                    <Input
                      id="fromPostalCode"
                      type="text"
                      placeholder="Origin postal code"
                      value={fromPostalCode}
                      onChange={(e) => setFromPostalCode(e.target.value)}
                      disabled={isLoading || sourceType === "my"}
                      required
                      style={{ maxWidth: "100%" }}
                    />
                  </div>
                </div>
              </div>
              {/* Destination (To) Section */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Destination
                </label>
                <div className="flex gap-4 mb-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="destType"
                      value="my"
                      checked={destType === "my"}
                      onChange={() => {
                        setDestType("my");
                        setTo(userLocations[toAddressIdx]?.country || "");
                        setToAddress(userLocations[toAddressIdx]?.street || "");
                        setToPostalCode(
                          userLocations[toAddressIdx]?.postalCode || "",
                        );
                        if (sourceType === "my") setSourceType("other");
                      }}
                      disabled={isLoading || sourceType === "my"}
                    />
                    My Address
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="destType"
                      value="other"
                      checked={destType === "other"}
                      onChange={() => {
                        setDestType("other");
                        setTo("");
                        setToAddress("");
                        setToPostalCode("");
                      }}
                      disabled={isLoading}
                    />
                    Other
                  </label>
                  {destType === "my" && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="ml-4"
                        onClick={() => setShowSelectAddress(true)}
                        disabled={isLoading}
                      >
                        Select Address
                      </Button>
                      <Dialog.Root
                        open={!!showSelectAddress}
                        onOpenChange={setShowSelectAddress}
                      >
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
                          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
                            <Dialog.Title className="text-lg font-bold mb-4">
                              Select Destination Address
                            </Dialog.Title>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {userLocations.length === 0 && (
                                <div className="text-muted-foreground text-sm">
                                  No saved addresses.
                                </div>
                              )}
                              {userLocations.map((loc, idx) => (
                                <div
                                  key={idx}
                                  className={`border rounded p-3 mb-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition ${
                                    toAddressIdx === idx
                                      ? "border-primary bg-card"
                                      : "border-border"
                                  }`}
                                  onClick={() => {
                                    setToAddressIdx(idx);
                                    setTo(loc.country || "");
                                    setToAddress(loc.street || "");
                                    setToPostalCode(loc.postalCode || "");
                                    setShowSelectAddress(false);
                                  }}
                                >
                                  <div className="font-medium">
                                    {loc.fullName}
                                    {<br />}
                                    {loc.street}, {loc.city}
                                  </div>
                                  <div className="text-xs">
                                    {loc.country} • {loc.postalCode} •{" "}
                                    {loc.addressType}
                                    {loc.primary ? " [Primary]" : ""}
                                  </div>
                                  <div className="text-xs">{loc.mobile}</div>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-end mt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowSelectAddress(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                      <Button
                        type="button"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          setIsEditingAddress(false);
                          setEditAddressIdx(null);
                          setAddressForm({
                            country: "",
                            countryCode: "",
                            fullName: user?.name || "",
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
                          setShowAddAddress(true);
                        }}
                      >
                        Add new address
                      </Button>
                    </>
                  )}
                </div>
                {/* Add/Edit Address Modal */}
                <Dialog.Root
                  open={showAddAddress}
                  onOpenChange={setShowAddAddress}
                >
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg">
                      <Dialog.Title className="text-lg font-bold mb-4">
                        {isEditingAddress ? "Edit Address" : "Add Address"}
                      </Dialog.Title>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setAddressLoading(true);
                          try {
                            const method = isEditingAddress ? "PUT" : "POST";
                            const payload = {
                              userId: user?.id,
                              address: addressForm,
                            };
                            const res = await fetch("/api/user/addresses", {
                              method,
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            });
                            const data = await res.json();
                            if (!res.ok)
                              throw new Error(
                                data.error || "Failed to save address",
                              );
                            // Update user context (localStorage and state)
                            const updatedUser = {
                              ...user,
                              locations: data.locations,
                            };
                            localStorage.setItem(
                              "user",
                              JSON.stringify(updatedUser),
                            );
                            window.dispatchEvent(new Event("storage"));
                            setShowAddAddress(false);
                          } catch (err: any) {
                            alert(err.message || "Failed to save address");
                          } finally {
                            setAddressLoading(false);
                          }
                        }}
                        className="space-y-3"
                      >
                        <Input
                          placeholder="Full Name"
                          value={addressForm.fullName}
                          onChange={(e) =>
                            setAddressForm((f) => ({
                              ...f,
                              fullName: e.target.value,
                            }))
                          }
                          required
                        />
                        <Input
                          placeholder="Mobile"
                          value={addressForm.mobile}
                          onChange={(e) =>
                            setAddressForm((f) => ({
                              ...f,
                              mobile: e.target.value,
                            }))
                          }
                          required
                        />
                        <Input
                          placeholder="Country"
                          value={addressForm.country}
                          onChange={(e) =>
                            setAddressForm((f) => ({
                              ...f,
                              country: e.target.value,
                            }))
                          }
                          required
                        />
                        <Input
                          placeholder="City"
                          value={addressForm.city}
                          onChange={(e) =>
                            setAddressForm((f) => ({
                              ...f,
                              city: e.target.value,
                            }))
                          }
                          required
                        />
                        <Input
                          placeholder="Street"
                          value={addressForm.street}
                          onChange={(e) =>
                            setAddressForm((f) => ({
                              ...f,
                              street: e.target.value,
                            }))
                          }
                          required
                        />
                        <Input
                          placeholder="Postal Code"
                          value={addressForm.postalCode}
                          onChange={(e) =>
                            setAddressForm((f) => ({
                              ...f,
                              postalCode: e.target.value,
                            }))
                          }
                          required
                        />
                        <Input
                          placeholder="Landmark"
                          value={addressForm.landmark}
                          onChange={(e) =>
                            setAddressForm((f) => ({
                              ...f,
                              landmark: e.target.value,
                            }))
                          }
                        />
                        <Input
                          placeholder="Delivery Instructions"
                          value={addressForm.deliveryInstructions}
                          onChange={(e) =>
                            setAddressForm((f) => ({
                              ...f,
                              deliveryInstructions: e.target.value,
                            }))
                          }
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={addressForm.primary}
                            onChange={(e) =>
                              setAddressForm((f) => ({
                                ...f,
                                primary: e.target.checked,
                              }))
                            }
                            id="primaryAddress"
                          />
                          <label htmlFor="primaryAddress">Set as primary</label>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            type="submit"
                            disabled={addressLoading}
                            className="flex-1"
                          >
                            {addressLoading
                              ? "Saving..."
                              : isEditingAddress
                                ? "Save Changes"
                                : "Add Address"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAddAddress(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Country
                    </label>
                    <Select
                      value={to}
                      onValueChange={setTo}
                      disabled={isLoading || destType === "my"}
                    >
                      <SelectTrigger style={{ width: "100%" }}>
                        <SelectValue placeholder="Select destination country" />
                      </SelectTrigger>
                      <SelectContent>{countryOptions}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1 max-w-full">
                      Address
                    </label>
                    <Input
                      id="toAddress"
                      type="text"
                      placeholder="Destination address"
                      value={toAddress}
                      onChange={(e) => setToAddress(e.target.value)}
                      disabled={isLoading || destType === "my"}
                      required
                      style={{ maxWidth: "100%" }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Postal Code
                    </label>
                    <Input
                      id="toPostalCode"
                      type="text"
                      placeholder="Destination postal code"
                      value={toPostalCode}
                      onChange={(e) => setToPostalCode(e.target.value)}
                      disabled={isLoading || destType === "my"}
                      required
                      style={{ maxWidth: "100%" }}
                    />
                  </div>
                </div>
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
