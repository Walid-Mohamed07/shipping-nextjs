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
} from "lucide-react";
import { Request, Address, Warehouse as WarehouseType, RequestDeliveryStatus } from "@/types";
import { getDistanceKm } from "@/lib/utils";

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
  { name: RequestDeliveryStatus.WAREHOUSE_DESTINATION_RECEIVED, icon: Warehouse },
  { name: RequestDeliveryStatus.PICKED_UP_DESTINATION, icon: MapPin },
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
              w.status === "active"
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
      }
    );
  };

  const handleLocationDecline = () => {
    setShowLocationPrompt(false);
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
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch request";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [user?.id, requestId]);

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
      case RequestDeliveryStatus.PICKED_UP_DESTINATION:
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
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${getOrderStatusBadgeColor(request.orderStatus)}`}
                >
                  Order: {request.orderStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Live Tracking Map - Only show when In Transit or later */}
          {(request.deliveryStatus === RequestDeliveryStatus.IN_TRANSIT || 
            request.deliveryStatus === RequestDeliveryStatus.WAREHOUSE_DESTINATION_RECEIVED ||
            request.deliveryStatus === RequestDeliveryStatus.PICKED_UP_DESTINATION) && 
            request.source && request.destination && (
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
                      within {NEARBY_RADIUS_KM} km of you. Your location is never
                      stored or shared.
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
                    width: `${(getCurrentStatusIndex(request.deliveryStatus) / (statusSteps.length - 1)) * 100}%`
                  }}
                />
                
                {/* Steps */}
                <div className="flex justify-between relative z-10">
                  {statusSteps.map((step, index) => {
                    const Icon = step.icon;
                    const currentIndex = getCurrentStatusIndex(request.deliveryStatus);
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                      <div key={step.name} className="flex flex-col items-center">
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
                  const currentIndex = getCurrentStatusIndex(request.deliveryStatus);
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
                          {isCurrent ? "Current step" : isCompleted ? "Completed" : "Pending"}
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
                  <p className="text-xs text-muted-foreground mb-1">Current Status</p>
                  <p className="text-sm font-semibold text-foreground">{request.deliveryStatus}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(getCurrentStatusIndex(request.deliveryStatus) / (statusSteps.length - 1)) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground ml-2">
                      {Math.round((getCurrentStatusIndex(request.deliveryStatus) / (statusSteps.length - 1)) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Steps Remaining</p>
                  <p className="text-sm font-semibold text-foreground">
                    {Math.max(0, statusSteps.length - 1 - getCurrentStatusIndex(request.deliveryStatus))} of {statusSteps.length - 1}
                  </p>
                </div>
              </div>
            </div>
          </div>

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
                    {request.source ? formatLocation(request.source) : (request.from ? formatLocation(request.from) : "-")}
                  </p>
                </div>
                <div className="border-l-2 border-primary h-8" />
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="text-lg font-medium text-foreground">
                    {request.destination ? formatLocation(request.destination) : (request.to ? formatLocation(request.to) : "-")}
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
                    <div key={item.id || `item-${idx}`} className="border border-border rounded-lg p-4 bg-white dark:bg-gray-900">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                              {idx + 1}
                            </span>
                            {item.name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{item.category}</p>
                        </div>
                        {item.quantity > 1 && (
                          <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                            ×{item.quantity}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Dimensions</p>
                          <p className="font-medium text-foreground">{item.dimensions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Weight</p>
                          <p className="font-medium text-foreground">{item.weight} kg</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Quantity</p>
                          <p className="font-medium text-foreground">{item.quantity}</p>
                        </div>
                      </div>
                      {item.note && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">Note</p>
                          <p className="text-sm text-foreground italic">{item.note}</p>
                        </div>
                      )}
                      {item.media && item.media.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">Media ({item.media.length})</p>
                          <div className="flex gap-2 flex-wrap">
                            {item.media.map((mediaUrl, mIdx) => (
                              <img
                                key={mIdx}
                                src={mediaUrl}
                                alt={`Item ${idx + 1} - Media ${mIdx + 1}`}
                                className="w-16 h-16 rounded-lg object-cover border border-border"
                              />
                            ))}
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
                  {request.createdAt ? new Date(request.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }) : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.createdAt ? new Date(request.createdAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : "-"}
                </p>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  When to Start (ETA)
                </h3>
                <p className="text-sm text-muted-foreground">
                  {request.whenToStart ? new Date(request.whenToStart).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }) : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.whenToStart ? new Date(request.whenToStart).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }) : "-"}
                </p>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  Delivery Type
                </h3>
                <p className="text-base font-medium text-foreground capitalize">
                  {request.deliveryType === "fast" ? "🔥 Fast Delivery" : "Normal Delivery"}
                </p>
                {request.deliveryType === "fast" && (
                  <p className="text-xs text-muted-foreground mt-1">+25% surcharge applied</p>
                )}
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" />
                  Primary Cost
                </h3>
                <p className="text-base font-medium text-foreground">
                  {request.primaryCost ? `$${request.primaryCost}` : "-"}
                </p>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Last Updated
              </h3>
              <p className="text-sm text-muted-foreground">
                {request.updatedAt ? new Date(request.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }) : "-"}
              </p>
              <p className="text-xs text-muted-foreground">
                {request.updatedAt ? new Date(request.updatedAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                }) : "-"}
              </p>
            </div>
          </div>

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
        </div>
      </div>
    </div>
  );
}
