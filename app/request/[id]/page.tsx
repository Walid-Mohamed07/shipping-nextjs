"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/app/components/Header";
import { LiveTrackingMap } from "@/app/components/LiveTrackingMap";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { toast, Toaster } from "sonner";
import Link from "next/link";
import {
  Package,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Banknote,
  Warehouse,
  Navigation,
  MapPinned,
  Truck,
  Box,
  Wrench,
  BoxSelect,
  ChevronDown,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Request,
  Address,
  Warehouse as WarehouseType,
  RequestDeliveryStatus,
} from "@/types";
import { getDistanceKm } from "@/lib/utils";
import dynamic from "next/dynamic";

// Dynamically import map components to avoid SSR issues
const LocationMapPicker = dynamic(
  () => import("@/app/components/LocationMapPicker").then((mod) => ({ default: mod.LocationMapPicker })),
  { ssr: false }
);

// Helper to format a location object for display
const formatLocation = (loc: Address) => {
  if (!loc) return "-";
  if (loc.street && loc.city && loc.country) {
    return `${loc.street}, ${loc.city}, ${loc.country}`;
  }
  if (loc.landmark) return loc.landmark;
  if (loc.street) return loc.street;
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  if (loc.city) return loc.city;
  if (loc.country) return loc.country;
  return "-";
};

const statusSteps = [
  { name: RequestDeliveryStatus.PENDING, icon: Clock },
  { name: RequestDeliveryStatus.PICKED_UP_SOURCE, icon: MapPin },
  { name: RequestDeliveryStatus.WAREHOUSE_SOURCE_RECEIVED, icon: Warehouse },
  { name: RequestDeliveryStatus.IN_TRANSIT, icon: Truck },
  {
    name: RequestDeliveryStatus.WAREHOUSE_DESTINATION_RECEIVED,
    icon: Warehouse,
  },
  { name: RequestDeliveryStatus.SHIPMENT_DELIVER, icon: Package },
  { name: RequestDeliveryStatus.DELIVERED, icon: CheckCircle2 },
];

const NEARBY_RADIUS_KM = 50;

export default function RequestDetailsPage() {
  const [request, setRequest] = useState<Request | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [nearbyWarehouses, setNearbyWarehouses] = useState<
    (WarehouseType & { distanceKm: number })[]
  >([]);
  const [locationChecked, setLocationChecked] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingOffer, setConfirmingOffer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const findNearbyWarehouses = () => {
    setShowLocationPrompt(true);
  };

  const handleLocationConfirm = () => {
    setShowLocationPrompt(false);
    setLocationError("");
    setLocationLoading(true);
    setLocationChecked(true);

    if (!navigator.geolocation) {
      setLocationError("Location is not supported by your browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        try {
          const res = await fetch("/api/warehouses");
          const data = await res.json();
          const warehouses: WarehouseType[] = data.warehouses || [];
          const withCoords = warehouses.filter(
            (w) =>
              w.latitude != null &&
              w.longitude != null &&
              w.status === "active",
          );
          const withDistance = withCoords
            .map((w) => ({
              ...w,
              distanceKm: getDistanceKm(lat, lng, w.latitude!, w.longitude!),
            }))
            .filter((w) => w.distanceKm <= NEARBY_RADIUS_KM)
            .sort((a, b) => a.distanceKm - b.distanceKm);
          setNearbyWarehouses(withDistance);
        } catch {
          const errorMsg = "Failed to load warehouses.";
          setLocationError(errorMsg);
          toast.error(errorMsg);
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        const errorMsg =
          err.code === 1
            ? "Location permission was denied."
            : "Could not get your location. Please try again.";
        setLocationError(errorMsg);
        toast.error(errorMsg);
        setLocationLoading(false);
      },
    );
  };

  const handleLocationDecline = () => {
    setShowLocationPrompt(false);
  };

  const handleSelectOffer = (offerId: string) => {
    // Update local request state to reflect the selection immediately
    if (request && request.costOffers) {
      const updatedRequest = {
        ...request,
        costOffers: request.costOffers.map((offer) => ({
          ...offer,
          selected: offer.company.id === offerId,
        })),
      };
      setRequest(updatedRequest);
      setSelectedOfferId(offerId);
      toast.success("Offer selected!");
    }
  };

  const handleSubmitOffer = async () => {
    const selectedOffer = request?.costOffers?.find(o => o.selected);
    if (!selectedOffer) {
      toast.error("Please select an offer first");
      return;
    }
    
    setConfirmingOffer(selectedOffer);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!confirmingOffer || !request) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${requestId}/submit-offer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId: confirmingOffer.company.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit offer");
      }

      const data = await response.json();
      
      toast.success("Offer submitted successfully!");
      setShowConfirmDialog(false);
      setConfirmingOffer(null);
      
      // Update the local request state with the response data
      if (data.request) {
        setRequest(data.request);
      }
      
      // Optionally redirect after a short delay to show the updated state
      setTimeout(() => {
        // Refresh the page data or stay on page to show updates
        window.location.reload();
      }, 2000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to submit offer";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!user || !user.id) {
      router.push("/login");
      return;
    }

    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/requests/${requestId}`);
        if (!response.ok) throw new Error("Request not found");
        const data = await response.json();

        if (data.request.userId !== user.id) {
          throw new Error("Unauthorized");
        }

        setRequest(data.request);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch request";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [user?.id, requestId]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case RequestDeliveryStatus.PENDING:
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800";
      case RequestDeliveryStatus.PICKED_UP_SOURCE:
      case RequestDeliveryStatus.WAREHOUSE_SOURCE_RECEIVED:
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-800";
      case RequestDeliveryStatus.IN_TRANSIT:
        return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800";
      case RequestDeliveryStatus.WAREHOUSE_DESTINATION_RECEIVED:
      case RequestDeliveryStatus.SHIPMENT_DELIVER:
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border border-purple-300 dark:border-purple-800";
      case RequestDeliveryStatus.DELIVERED:
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-800";
      case RequestDeliveryStatus.FAILED:
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-800";
      case "Cancelled":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-800";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  const getCurrentStatusIndex = (status: string) => {
    const index = statusSteps.findIndex((step) => step.name === status);
    return index !== -1 ? index : statusSteps.length - 1;
  };

  const getOrderStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400";
      case "Accepted":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Rejected":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
      case "Action needed":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border border-orange-300 dark:border-orange-700";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded-lg animate-pulse" />
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-red-800 dark:text-red-400 mb-2">
                Error
              </h2>
              <p className="text-red-700 dark:text-red-400">
                {error || "Request not found"}
              </p>
              <Link href="/my-requests" className="mt-4 inline-block">
                <Button className="cursor-pointer" variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Requests
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/my-requests" className="inline-block mb-6">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Requests
          </Button>
        </Link>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-card rounded-lg border border-border p-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {request.id}
                </h1>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-4 py-2 w-max rounded-full text-sm font-semibold ${getOrderStatusBadgeColor(request.requestStatus)}`}
                >
                  Order: {request.requestStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Live Tracking Map - Only show when In Transit or later */}
          {(request.deliveryStatus === RequestDeliveryStatus.IN_TRANSIT ||
            request.deliveryStatus ===
              RequestDeliveryStatus.WAREHOUSE_DESTINATION_RECEIVED ||
            request.deliveryStatus ===
              RequestDeliveryStatus.SHIPMENT_DELIVER) &&
            request.source &&
            request.destination && (
              <LiveTrackingMap
                from={request.source.country}
                to={request.destination.country}
                isInTransit={true}
              />
            )}

          {/* Location permission dialog - ask before sharing */}
          {showLocationPrompt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPinned className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      Share your location?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      ShipHub would like to use your location to find warehouses
                      within {NEARBY_RADIUS_KM} km of you. Your location is
                      never stored or shared.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleLocationConfirm}
                    className="flex-1 cursor-pointer"
                  >
                    Allow
                  </Button>
                  <Button
                    onClick={handleLocationDecline}
                    variant="outline"
                    className="flex-1 bg-transparent cursor-pointer"
                  >
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Status Timeline - Redesigned */}
          <div className="bg-card rounded-lg border border-border p-8">
            <h2 className="text-xl font-semibold text-foreground mb-8">
              Shipment Progress
            </h2>

            {/* Timeline Container */}
            <div className="relative">
              {/* Desktop: Horizontal Timeline */}
              <div className="hidden md:block">
                {/* Progress Bar Background */}
                <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full" />

                {/* Progress Bar Fill */}
                <div
                  className="absolute top-6 left-0 h-1 bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${(getCurrentStatusIndex(request.deliveryStatus) / (statusSteps.length - 1)) * 100}%`,
                  }}
                />

                {/* Steps */}
                <div className="flex justify-between relative z-10">
                  {statusSteps.map((step, index) => {
                    const Icon = step.icon;
                    const currentIndex = getCurrentStatusIndex(
                      request.deliveryStatus,
                    );
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                      <div
                        key={step.name}
                        className="flex flex-col items-center"
                      >
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all border-2 ${
                            isCompleted
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-muted"
                          } ${isCurrent ? "ring-4 ring-primary/30" : ""}`}
                        >
                          <Icon className="w-7 h-7" />
                        </div>
                        <span
                          className={`text-xs font-semibold text-center max-w-[100px] transition-colors ${
                            isCurrent
                              ? "text-primary"
                              : isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {step.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile: Vertical Timeline */}
              <div className="md:hidden space-y-6">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const currentIndex = getCurrentStatusIndex(
                    request.deliveryStatus,
                  );
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;

                  return (
                    <div key={step.name} className="flex gap-4">
                      {/* Timeline Line and Dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 flex-shrink-0 ${
                            isCompleted
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-muted"
                          } ${isCurrent ? "ring-4 ring-primary/30" : ""}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        {index < statusSteps.length - 1 && (
                          <div
                            className={`w-1 h-16 my-2 transition-colors ${
                              isCompleted ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        )}
                      </div>

                      {/* Status Content */}
                      <div className="pb-4 flex-1">
                        <h4
                          className={`font-semibold transition-colors ${
                            isCurrent
                              ? "text-primary"
                              : isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {step.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isCurrent
                            ? "Current step"
                            : isCompleted
                              ? "Completed"
                              : "Pending"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Summary Card */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Current Delivery Status
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {request.deliveryStatus}
                  </p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(getCurrentStatusIndex(request.deliveryStatus) / (statusSteps.length - 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground ml-2">
                      {Math.round(
                        (getCurrentStatusIndex(request.deliveryStatus) /
                          (statusSteps.length - 1)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Steps Remaining
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {Math.max(
                      0,
                      statusSteps.length -
                        1 -
                        getCurrentStatusIndex(request.deliveryStatus),
                    )}{" "}
                    of {statusSteps.length - 1}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Offers Section - Show when Action needed */}
          {request.requestStatus === "Action needed" && request.costOffers && request.costOffers.length > 0 && (
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Shipping Offers
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred shipping company
                </p>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {request.costOffers.map((offer, idx) => (
                    <div
                      key={offer.company.id}
                      onClick={() => handleSelectOffer(offer.company.id)}
                      className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        offer.selected
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                      }`}
                    >
                    {/* Selected Badge */}
                    {offer.selected && (
                      <div className="absolute -top-2 -right-2">
                        <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold shadow-sm">
                          <CheckCircle2 className="w-3 h-3" />
                          Selected
                        </div>
                      </div>
                    )}

                    {/* Option Label */}
                    <div className="mb-3">
                      <h3 className="text-base font-bold text-foreground mb-1">
                        Option {idx + 1}
                      </h3>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500 text-sm">★</span>
                        <span className="text-sm font-semibold text-foreground">
                          {offer.company.rate}
                        </span>
                      </div>
                    </div>

                    {/* Cost */}
                    <div className="mb-3 p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-md border border-amber-200/50 dark:border-amber-800/50">
                      <p className="text-2xl font-bold text-foreground">
                        ${offer.cost.toFixed(2)}
                      </p>
                    </div>

                    {/* Delivery Reason */}
                    {offer.comment && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {offer.comment}
                      </p>
                    )}

                    {/* Select Indicator */}
                    <div className={`text-center text-xs font-medium py-1 rounded ${
                      offer.selected 
                        ? "text-primary" 
                        : "text-muted-foreground"
                    }`}>
                      {offer.selected ? "✓ Your Choice" : "Click to select"}
                    </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Submit Button */}
              <div className="mt-4">
                <Button
                  onClick={handleSubmitOffer}
                  className="w-full bg-primary text-primary-foreground cursor-pointer"
                >
                  Submit Selected Offer
                </Button>
              </div>
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirmDialog && confirmingOffer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      Confirm Selection
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Are you sure you want to select this shipping company?
                    </p>
                  </div>
                </div>

                {/* Offer Details */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold text-foreground">
                      {confirmingOffer.company.rate}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary mb-2">
                    ${confirmingOffer.cost.toFixed(2)}
                  </p>
                  {confirmingOffer.comment && (
                    <p className="text-sm text-muted-foreground">
                      {confirmingOffer.comment}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setConfirmingOffer(null);
                    }}
                    variant="outline"
                    className="flex-1 bg-transparent cursor-pointer"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmSubmit}
                    className="flex-1 bg-primary text-primary-foreground cursor-pointer"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Yes, Confirm"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Route Details */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Route Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="text-lg font-medium text-foreground">
                    {request.source
                      ? formatLocation(request.source)
                      : request.from
                        ? formatLocation(request.from)
                        : "-"}
                  </p>
                </div>
                <div className="border-l-2 border-primary h-8" />
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="text-lg font-medium text-foreground">
                    {request.destination
                      ? formatLocation(request.destination)
                      : request.to
                        ? formatLocation(request.to)
                        : "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Package Details - All Items */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Shipment Items ({request.items?.length || 0})
              </h3>

              <div className="max-h-52 overflow-y-auto pr-2 space-y-4   p-2 rounded-md">
                {request.items && request.items.length > 0 ? (
                  request.items.map((item, idx) => (
                    <div
                      key={item.id || `item-${idx}`}
                      className="border border-border rounded-lg p-4 bg-white dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                              {idx + 1}
                            </span>
                            {item.name || item.item}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.category}
                          </p>
                        </div>
                        {item.quantity > 1 && (
                          <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                            ×{item.quantity}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Dimensions
                          </p>
                          <p className="font-medium text-foreground">
                            {item.dimensions}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Weight
                          </p>
                          <p className="font-medium text-foreground">
                            {item.weight} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Quantity
                          </p>
                          <p className="font-medium text-foreground">
                            {item.quantity}
                          </p>
                        </div>
                      </div>
                      {item.note && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">Note</p>
                          <p className="text-sm text-foreground italic">
                            {item.note}
                          </p>
                        </div>
                      )}
                      {item.media && item.media.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">
                            Media ({item.media.length})
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {item.media.map((mediaItem, mIdx) => {
                              const url = typeof mediaItem === 'string' ? mediaItem : mediaItem.url;
                              return (
                                <img
                                  key={mIdx}
                                  src={url}
                                  alt={`Item ${idx + 1} - Media ${mIdx + 1}`}
                                  className="w-16 h-16 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    setSelectedImageUrl(url);
                                    setShowImageZoom(true);
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {item.services && (item.services.canBeAssembledDisassembled || item.services.assemblyDisassembly || item.services.packaging) && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">
                            Services
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(item.services.canBeAssembledDisassembled || item.services.assemblyDisassembly) && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <Wrench className="w-3 h-3" />
                                Assembly &amp; Disassembly
                                {item.services.assemblyDisassemblyHandler && (
                                  <span className="ml-1 text-[10px]">
                                    ({item.services.assemblyDisassemblyHandler === "self" ? "Self" : "Company"})
                                  </span>
                                )}
                              </span>
                            )}
                            {item.services.packaging && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <BoxSelect className="w-3 h-3" />
                                Packaging
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No items</p>
                )}
              </div>
            </div>
          </div>

          {/* Timing & Delivery Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Requested Date
                </h3>
                <p className="text-sm text-muted-foreground">
                  {request.createdAt
                    ? new Date(request.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.createdAt
                    ? new Date(request.createdAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </p>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  When to Start (ETA)
                </h3>
                <p className="text-sm text-muted-foreground">
                  {request.startTime
                    ? new Date(request.startTime).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.startTime
                    ? new Date(request.startTime).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </p>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  Delivery Type
                </h3>
                <p className="text-base font-medium w-max text-foreground capitalize">
                  {request.deliveryType === "Urgent"
                    ? "🔥 Urgent Delivery"
                    : "Normal Delivery"}
                </p>
                {request.deliveryType === "Urgent" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +25% surcharge applied
                  </p>
                )}
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" />
                  {request.selectedCompany ? "Cost" : "Primary Cost"}
                </h3>
                {request.selectedCompany ? (
                  <>
                    <p className="text-xl font-bold text-primary">
                      ${Number(request.selectedCompany.cost).toFixed(2)}
                    </p>
                    {request.primaryCost && (
                      <p className="text-xs text-muted-foreground mt-2 line-through">
                        Primary: ${Number(request.primaryCost).toFixed(2)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-base font-medium text-foreground">
                    {request.primaryCost
                      ? `$${Number(request.primaryCost).toFixed(2)}`
                      : request.cost
                      ? `$${Number(request.cost).toFixed(2)}`
                      : "-"}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Activity Log
              </h3>

              {/* Last updated time */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <span>Updated:</span>
                <span className="font-medium text-foreground">
                  {request.updatedAt
                    ? `${new Date(request.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })} at ${new Date(request.updatedAt).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "-"}
                </span>
              </div>

              {/* Selected offer info */}
              {request.selectedCompany && (
                <div className="mb-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Accepted Offer</p>
                      <p className="text-sm font-semibold text-primary">
                        ${Number(request.selectedCompany.cost).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-background rounded-full px-2 py-1">
                      <span className="text-yellow-500 text-sm">★</span>
                      <span className="text-sm font-bold text-foreground">
                        {request.selectedCompany.rate}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity entries */}
              {request.activityHistory && request.activityHistory.length > 0 ? (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {[...request.activityHistory].reverse().map((activity, index) => (
                    <div
                      key={index}
                      className="flex gap-3 text-sm"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-medium text-foreground truncate">
                            {activity.action}
                          </p>
                          <time className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(activity.timestamp).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </time>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activity.description}
                        </p>
                        {activity.cost && (
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="text-primary font-semibold">${Number(activity.cost).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
              )}
            </div>
          </div>

          {/* Warehouse Locations Section - Show when warehouses are assigned */}
          {(request.sourceWarehouse || request.destinationWarehouse) && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-primary" />
                Assigned Warehouse Locations
              </h3>
              
              {/* Show accordion if both warehouses are assigned */}
              {request.sourceWarehouse && request.destinationWarehouse ? (
                <Accordion type="single" className="space-y-3">
                  {/* Source Warehouse */}
                  <AccordionItem value="source" className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                    <AccordionTrigger value="source" className="bg-transparent">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">Source Warehouse (Pickup)</p>
                          <p className="text-xs text-muted-foreground">{request.sourceWarehouse.name}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent value="source" className="bg-white/50 dark:bg-gray-900/50">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Warehouse Name</p>
                          <p className="text-sm font-medium text-foreground">{request.sourceWarehouse.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Address</p>
                          <p className="text-sm font-medium text-foreground">{request.sourceWarehouse.address}</p>
                          {(request.sourceWarehouse.city || request.sourceWarehouse.country) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {[request.sourceWarehouse.city, request.sourceWarehouse.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        {request.sourceWarehouse.assignedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Assigned On</p>
                            <p className="text-sm text-foreground">
                              {new Date(request.sourceWarehouse.assignedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        )}
                        {request.sourceWarehouse.coordinates && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Location on Map</p>
                            <div className="h-64 w-full rounded-lg overflow-hidden border border-border">
                              <LocationMapPicker
                                position={{
                                  lat: request.sourceWarehouse.coordinates.latitude,
                                  lng: request.sourceWarehouse.coordinates.longitude,
                                }}
                                onPositionChange={() => {}}
                                editable={false}
                                showUseMyLocation={false}
                                zoom={15}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Destination Warehouse */}
                  <AccordionItem value="destination" className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                    <AccordionTrigger value="destination" className="bg-transparent">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <MapPinned className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">Destination Warehouse (Delivery)</p>
                          <p className="text-xs text-muted-foreground">{request.destinationWarehouse.name}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent value="destination" className="bg-white/50 dark:bg-gray-900/50">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Warehouse Name</p>
                          <p className="text-sm font-medium text-foreground">{request.destinationWarehouse.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Address</p>
                          <p className="text-sm font-medium text-foreground">{request.destinationWarehouse.address}</p>
                          {(request.destinationWarehouse.city || request.destinationWarehouse.country) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {[request.destinationWarehouse.city, request.destinationWarehouse.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        {request.destinationWarehouse.assignedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Assigned On</p>
                            <p className="text-sm text-foreground">
                              {new Date(request.destinationWarehouse.assignedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        )}
                        {request.destinationWarehouse.coordinates && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Location on Map</p>
                            <div className="h-64 w-full rounded-lg overflow-hidden border border-border">
                              <LocationMapPicker
                                position={{
                                  lat: request.destinationWarehouse.coordinates.latitude,
                                  lng: request.destinationWarehouse.coordinates.longitude,
                                }}
                                onPositionChange={() => {}}
                                editable={false}
                                showUseMyLocation={false}
                                zoom={15}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ) : (
                /* Show single warehouse card if only one is assigned */
                <div className="space-y-4">
                  {request.sourceWarehouse && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-2">Source Warehouse (Pickup)</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Warehouse Name</p>
                              <p className="font-medium text-foreground">{request.sourceWarehouse.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Address</p>
                              <p className="font-medium text-foreground">{request.sourceWarehouse.address}</p>
                              {(request.sourceWarehouse.city || request.sourceWarehouse.country) && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {[request.sourceWarehouse.city, request.sourceWarehouse.country].filter(Boolean).join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {request.sourceWarehouse.coordinates && (
                        <div className="h-64 w-full rounded-lg overflow-hidden border border-blue-200 dark:border-blue-700">
                          <LocationMapPicker
                            position={{
                              lat: request.sourceWarehouse.coordinates.latitude,
                              lng: request.sourceWarehouse.coordinates.longitude,
                            }}
                            onPositionChange={() => {}}
                            editable={false}
                            showUseMyLocation={false}
                            zoom={15}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {request.destinationWarehouse && (
                    <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <MapPinned className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-2">Destination Warehouse (Delivery)</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Warehouse Name</p>
                              <p className="font-medium text-foreground">{request.destinationWarehouse.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Address</p>
                              <p className="font-medium text-foreground">{request.destinationWarehouse.address}</p>
                              {(request.destinationWarehouse.city || request.destinationWarehouse.country) && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {[request.destinationWarehouse.city, request.destinationWarehouse.country].filter(Boolean).join(", ")}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {request.destinationWarehouse.coordinates && (
                        <div className="h-64 w-full rounded-lg overflow-hidden border border-green-200 dark:border-green-700">
                          <LocationMapPicker
                            position={{
                              lat: request.destinationWarehouse.coordinates.latitude,
                              lng: request.destinationWarehouse.coordinates.longitude,
                            }}
                            onPositionChange={() => {}}
                            editable={false}
                            showUseMyLocation={false}
                            zoom={15}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Link href="/my-requests" className="flex-1">
              <Button
                variant="outline"
                className="w-full bg-transparent cursor-pointer"
              >
                Back to Requests
              </Button>
            </Link>
            <Link href="/new-request" className="flex-1">
              <Button className="w-full cursor-pointer">
                Create New Request
              </Button>
            </Link>
          </div>

          {/* Image Zoom Modal */}
          {showImageZoom && selectedImageUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => {
                setShowImageZoom(false);
                setSelectedImageUrl(null);
              }}
            >
              <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
  );
}
