"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useLiveRequest, useLiveEvent } from "@/app/hooks/useLiveData";
import { useRealTime } from "@/app/context/RealTimeContext";
import { toast } from "sonner";
import {
  MapPin,
  Package,
  Loader2,
  Warehouse,
  Truck,
  User as UserIcon,
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Navigation,
  Building2,
  Wifi,
  WifiOff,
  DollarSign,
  Scale,
  Box,
} from "lucide-react";
import { Request } from "@/types";
import dynamic from "next/dynamic";

// Dynamically import map component
const SimpleLocationMap = dynamic(
  () =>
    import("@/app/components/SimpleLocationMap").then(
      (mod) => mod.SimpleLocationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    ),
  },
);

interface CompanyWarehouse {
  id: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
}

export default function OngoingRequestDetailPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const requestId = params?.id as string;
  const { isConnected } = useRealTime();

  // Use live data hook for real-time request updates
  const {
    data: liveRequest,
    isLoading: requestLoading,
    error: requestError,
    refresh: refreshRequest,
  } = useLiveRequest(requestId);

  const [request, setRequest] = useState<Request | null>(null);
  const [warehouses, setWarehouses] = useState<CompanyWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningSourceWarehouse, setAssigningSourceWarehouse] = useState(false);
  const [assigningDestinationWarehouse, setAssigningDestinationWarehouse] = useState(false);
  const [selectedSourceWarehouseId, setSelectedSourceWarehouseId] = useState("");
  const [selectedDestinationWarehouseId, setSelectedDestinationWarehouseId] = useState("");
  const [updatingDeliveryStatus, setUpdatingDeliveryStatus] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");
  const [mapView, setMapView] = useState<"pickup" | "delivery">("pickup");

  // Update local request state when live data changes
  useEffect(() => {
    if (liveRequest) {
      setRequest(liveRequest as Request);
      setLoading(false);
    }
  }, [liveRequest]);

  // Show toast notifications for real-time events on this request
  useLiveEvent(
    ["DELIVERY_STATUS_CHANGED", "WAREHOUSE_ASSIGNED", "STATUS_CHANGED"],
    (event) => {
      if (event.requestId !== requestId) return;

      if (event.type === "DELIVERY_STATUS_CHANGED") {
        toast.success("Delivery status updated!", {
          description: `Status: ${event.payload.newStatus}`,
        });
      } else if (event.type === "WAREHOUSE_ASSIGNED") {
        toast.info("Warehouse assigned", {
          description: `${event.payload.warehouseType} warehouse: ${event.payload.warehouseName}`,
        });
      } else if (event.type === "STATUS_CHANGED") {
        toast.info("Request status updated", {
          description: `Status: ${event.payload.newStatus}`,
        });
      }
    },
    requestId,
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "company") {
      router.push("/");
      return;
    }
    fetchWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, authLoading, requestId]);

  // Fetch warehouses separately (request is fetched via useLiveRequest)
  const fetchWarehouses = async () => {
    if (!user?.id) return;
    try {
      const warehousesRes = await fetch(`/api/company/warehouses?companyId=${user.id}`);
      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        setWarehouses(data.warehouses || []);
      } else {
        console.error("Failed to fetch warehouses");
      }
    } catch (error) {
      console.error("Failed to fetch warehouses:", error);
    }
  };

  const handleAssignWarehouse = async (warehouseType: "source" | "destination") => {
    const warehouseId = warehouseType === "source" ? selectedSourceWarehouseId : selectedDestinationWarehouseId;
    const setAssigning = warehouseType === "source" ? setAssigningSourceWarehouse : setAssigningDestinationWarehouse;

    if (!warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }

    try {
      setAssigning(true);
      const response = await fetch("/api/company/assign-warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request?.id,
          companyId: user?.id,
          warehouseId,
          warehouseType,
        }),
      });

      if (response.ok) {
        const locationLabel = warehouseType === "source" ? "pickup" : "delivery";
        toast.success("Warehouse assigned!", {
          description: `The client has been notified of the ${locationLabel} location.`,
        });
        // Real-time update will refresh the request automatically
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to assign warehouse");
      }
    } catch (error) {
      console.error("Failed to assign warehouse:", error);
      toast.error("Failed to assign warehouse");
    } finally {
      setAssigning(false);
    }
  };

  const needsSourceWarehouseAssignment = (req: Request | null) => {
    if (!req) return false;
    const sourceIsSelfPickup = req.sourcePickupMode === "Self" || req.source?.pickupMode === "Self";
    return sourceIsSelfPickup && !req.sourceWarehouse;
  };

  const needsDestinationWarehouseAssignment = (req: Request | null) => {
    if (!req) return false;
    const destinationIsSelfDelivery = req.destinationPickupMode === "Self" || req.destination?.pickupMode === "Self";
    return destinationIsSelfDelivery && !req.destinationWarehouse;
  };

  const needsWarehouseAssignment = (req: Request | null) => {
    return needsSourceWarehouseAssignment(req) || needsDestinationWarehouseAssignment(req);
  };

  // Delivery Status Management
  const DELIVERY_STATUSES = [
    { key: "Pending", label: "Pending", icon: Clock },
    { key: "Picked Up Source", label: "Picked Up", icon: Package },
    {
      key: "Warehouse Source Received",
      label: "At Source Warehouse",
      icon: Building2,
    },
    { key: "In Transit", label: "In Transit", icon: Truck },
    {
      key: "Warehouse Destination Received",
      label: "At Destination Warehouse",
      icon: Building2,
    },
    { key: "Shipment Deliver", label: "Out for Delivery", icon: Navigation },
    { key: "Delivered", label: "Delivered", icon: CheckCircle2 },
  ];

  const getAvailableActions = (req: Request | null) => {
    if (!req) return [];

    // Block all actions until ALL required warehouses are assigned
    const needsSourceWh = needsSourceWarehouseAssignment(req);
    const needsDestWh = needsDestinationWarehouseAssignment(req);
    if (needsSourceWh || needsDestWh) {
      return []; // Return empty actions - user must assign warehouses first
    }

    const currentStatus = req.deliveryStatus || "Pending";
    const sourceMode =
      req.sourcePickupMode || req.source?.pickupMode || "Delegate";
    const destMode =
      req.destinationPickupMode || req.destination?.pickupMode || "Delegate";

    const actions: {
      status: string;
      label: string;
      description: string;
      icon: any;
      variant: "default" | "outline";
    }[] = [];

    switch (currentStatus) {
      case "Pending":
        if (sourceMode === "Delegate") {
          actions.push({
            status: "Picked Up Source",
            label: "Confirm Pickup",
            description: "Mark items as picked up from customer's location",
            icon: Package,
            variant: "default",
          });
        } else {
          // Self pickup - customer drops off at warehouse
          if (req.sourceWarehouse) {
            actions.push({
              status: "Warehouse Source Received",
              label: "Confirm Customer Drop-off",
              description: `Customer dropped items at ${req.sourceWarehouse.name}`,
              icon: Building2,
              variant: "default",
            });
          }
        }
        break;

      case "Picked Up Source":
        actions.push({
          status: "Warehouse Source Received",
          label: "Mark Received at Warehouse",
          description: "Items have arrived at your source warehouse",
          icon: Building2,
          variant: "default",
        });
        break;

      case "Warehouse Source Received":
        actions.push({
          status: "In Transit",
          label: "Start Transit",
          description:
            "Items are leaving warehouse and in transit to destination",
          icon: Truck,
          variant: "default",
        });
        break;

      case "In Transit":
        if (destMode === "Self" && req.destinationWarehouse) {
          actions.push({
            status: "Warehouse Destination Received",
            label: "Mark Arrived at Destination",
            description: `Items arrived at ${req.destinationWarehouse.name}`,
            icon: Building2,
            variant: "default",
          });
        } else {
          actions.push({
            status: "Shipment Deliver",
            label: "Out for Delivery",
            description: "Items are out for final delivery to customer",
            icon: Navigation,
            variant: "default",
          });
        }
        break;

      case "Warehouse Destination Received":
        actions.push({
          status: "Delivered",
          label: "Confirm Customer Pickup",
          description: "Customer has picked up their items",
          icon: CheckCircle2,
          variant: "default",
        });
        break;

      case "Shipment Deliver":
        actions.push({
          status: "Delivered",
          label: "Mark Delivered",
          description: "Items have been delivered to customer",
          icon: CheckCircle2,
          variant: "default",
        });
        break;
    }

    return actions;
  };

  const getCurrentStatusIndex = (status: string) => {
    return DELIVERY_STATUSES.findIndex((s) => s.key === status);
  };

  const handleUpdateDeliveryStatus = async (newStatus: string) => {
    if (!request || !user?.id) return;

    try {
      setUpdatingDeliveryStatus(true);
      const response = await fetch("/api/company/delivery-status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          companyId: user.id,
          newStatus,
          note: deliveryNote || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Delivery status updated!");
        setDeliveryNote("");
        // Real-time update will refresh the request automatically
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update delivery status");
      }
    } catch (error) {
      console.error("Failed to update delivery status:", error);
      toast.error("Failed to update delivery status");
    } finally {
      setUpdatingDeliveryStatus(false);
    }
  };

  // Loading state
  if (authLoading || loading || requestLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Auth check
  if (!user || user.role !== "company") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Access denied. This page is for companies only.</p>
          <Button variant="outline" onClick={() => router.push("/")} className="mt-4">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Error state
  if (requestError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Failed to load request</p>
          <p className="text-sm text-destructive mb-4">{requestError}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => refreshRequest()}>Try Again</Button>
            <Button variant="outline" onClick={() => router.push("/company/ongoing")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Request not found</p>
          <Button variant="outline" onClick={() => router.push("/company/ongoing")} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ongoing
          </Button>
        </div>
      </div>
    );
  }

  const sourceIsSelfPickup = request.sourcePickupMode === "Self" || request.source?.pickupMode === "Self";
  const destinationIsSelfDelivery = request.destinationPickupMode === "Self" || request.destination?.pickupMode === "Self";
  const needsSourceWarehouse = needsSourceWarehouseAssignment(request);
  const needsDestWarehouse = needsDestinationWarehouseAssignment(request);

  const totalWeight = request.items.reduce(
    (sum, item) => sum + parseFloat(item.weight || "0") * item.quantity,
    0,
  );
  const totalQuantity = request.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push("/company/ongoing")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {request.publicId || `Request ${request.id}`}
                </h1>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                  Ongoing
                </Badge>
                {/* Real-time connection indicator */}
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    isConnected
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}
                >
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isConnected ? "Live" : "..."}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {needsSourceWarehouse && (
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Source Warehouse Required
                  </Badge>
                )}
                {needsDestWarehouse && (
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Destination Warehouse Required
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div className="flex items-center gap-1 justify-end">
              <Calendar className="w-3 h-3" />
              {new Date(request.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Progress */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Navigation className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Delivery Progress</h2>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                    style={{
                      width: `${((getCurrentStatusIndex(request.deliveryStatus || "Pending") + 1) / DELIVERY_STATUSES.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>Step {getCurrentStatusIndex(request.deliveryStatus || "Pending") + 1}</span>
                  <span>of {DELIVERY_STATUSES.length}</span>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="flex justify-between overflow-x-auto py-2 mb-4">
                {DELIVERY_STATUSES.map((status, index) => {
                  const StatusIcon = status.icon;
                  const currentIndex = getCurrentStatusIndex(request.deliveryStatus || "Pending");
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;

                  return (
                    <div
                      key={status.key}
                      className={`flex flex-col items-center min-w-[70px] ${isCurrent ? "scale-105" : ""}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      >
                        {isCompleted && index < currentIndex ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <StatusIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-[10px] text-center leading-tight ${
                          isCurrent
                            ? "font-semibold text-primary"
                            : isCompleted
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Current Status */}
              <div className="bg-primary/5 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const currentStatus = DELIVERY_STATUSES.find(
                      (s) => s.key === (request.deliveryStatus || "Pending"),
                    );
                    const Icon = currentStatus?.icon || Clock;
                    return (
                      <>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Current Status</p>
                          <p className="text-lg font-bold">{currentStatus?.label || request.deliveryStatus}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Actions */}
              {request.deliveryStatus !== "Delivered" ? (
                <div>
                  {getAvailableActions(request).length > 0 ? (
                    <div className="space-y-3">
                      {getAvailableActions(request).map((action) => {
                        const ActionIcon = action.icon;
                        return (
                          <div
                            key={action.status}
                            className="bg-muted/50 rounded-lg p-4 border border-border"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <ActionIcon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold mb-1">{action.label}</h4>
                                <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                                <div className="flex gap-2 items-center">
                                  <input
                                    type="text"
                                    placeholder="Add note (optional)..."
                                    value={deliveryNote}
                                    onChange={(e) => setDeliveryNote(e.target.value)}
                                    className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
                                  />
                                  <Button
                                    onClick={() => handleUpdateDeliveryStatus(action.status)}
                                    disabled={updatingDeliveryStatus}
                                  >
                                    {updatingDeliveryStatus ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <>
                                        <ActionIcon className="w-4 h-4 mr-2" />
                                        Update
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800 dark:text-yellow-200">Action Required</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            {needsSourceWarehouse && needsDestWarehouse
                              ? "Please assign both source and destination warehouses before updating delivery status."
                              : needsSourceWarehouse
                                ? "Please assign a source warehouse first."
                                : "Please assign a destination warehouse first."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <h3 className="font-bold text-green-800 dark:text-green-200">Delivery Completed</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">Successfully delivered to the customer.</p>
                </div>
              )}
            </Card>

            {/* Route Details */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Route Details
                </h3>
                
                {/* Map Toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border">
                  <button
                    onClick={() => setMapView("pickup")}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                      mapView === "pickup"
                        ? "bg-green-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Pickup
                  </button>
                  <button
                    onClick={() => setMapView("delivery")}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                      mapView === "delivery"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Delivery
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Pickup Location */}
                {mapView === "pickup" && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold">Pickup Location</h3>
                      {sourceIsSelfPickup && (
                        <Badge className="ml-auto bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                          Self Pickup
                        </Badge>
                      )}
                    </div>
                    <div className="ml-7 space-y-1 text-sm">
                      <p className="font-medium">{request.source.city}, {request.source.country}</p>
                      {request.source.street && <p className="text-muted-foreground">{request.source.street}</p>}
                      {request.source.mobile && (
                        <p className="text-muted-foreground flex items-center gap-1 mt-2">
                          <Phone className="w-3 h-3" /> {request.source.mobile}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Delivery Location */}
                {mapView === "delivery" && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold">Delivery Location</h3>
                      {destinationIsSelfDelivery && (
                        <Badge className="ml-auto bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                          Self Delivery
                        </Badge>
                      )}
                    </div>
                    <div className="ml-7 space-y-1 text-sm">
                      <p className="font-medium">{request.destination.city}, {request.destination.country}</p>
                      {request.destination.street && <p className="text-muted-foreground">{request.destination.street}</p>}
                      {request.destination.mobile && (
                        <p className="text-muted-foreground flex items-center gap-1 mt-2">
                          <Phone className="w-3 h-3" /> {request.destination.mobile}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Map Display */}
                {((mapView === "pickup" && request.source.coordinates) ||
                  (mapView === "delivery" && request.destination.coordinates)) && (
                  <div className={`rounded-lg overflow-hidden border-2 transition-colors ${
                    mapView === "pickup" 
                      ? "border-green-400 dark:border-green-600" 
                      : "border-blue-400 dark:border-blue-600"
                  }`}>
                    <div className="h-64">
                      <SimpleLocationMap
                        key={mapView}
                        position={
                          mapView === "pickup"
                            ? [request.source.coordinates!.latitude, request.source.coordinates!.longitude]
                            : [request.destination.coordinates!.latitude, request.destination.coordinates!.longitude]
                        }
                        label={
                          mapView === "pickup"
                            ? `Pickup: ${request.source.city}`
                            : `Delivery: ${request.destination.city}`
                        }
                      />
                    </div>
                  </div>
                )}

                {/* No coordinates fallback */}
                {!request.source.coordinates && !request.destination.coordinates && (
                  <div className="h-32 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
                    <div className="text-center">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Map coordinates not available</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Items */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Items ({request.items.length})
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Box className="w-4 h-4" /> {totalQuantity} units
                  </span>
                  <span className="flex items-center gap-1">
                    <Scale className="w-4 h-4" /> {totalWeight.toFixed(1)} kg
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {request.items.map((item, index) => (
                  <div key={index} className="bg-muted/50 rounded-lg p-3 border border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.name || item.item || `Item ${index + 1}`}</p>
                        <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                          {item.weight && <span>Weight: {item.weight} kg</span>}
                          {item.quantity && <span>Qty: {item.quantity}</span>}
                        </div>
                      </div>
                      {item.category && (
                        <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6 lg:self-start lg:sticky lg:top-6">
            {/* Client Info */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-primary" />
                Client Info
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{request.user?.fullName || "N/A"}</p>
                </div>
                {request.user?.email && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </p>
                    <p className="text-sm break-all">{request.user.email}</p>
                  </div>
                )}
                {request.user?.mobile && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Phone
                    </p>
                    <p className="font-medium">{request.user.mobile}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Financial Info */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Financial
              </h3>
              <div className="text-center py-2">
                <p className="text-xs text-muted-foreground">Your Offer</p>
                <p className="text-3xl font-bold text-primary">
                  ${request.selectedCompany?.cost?.toFixed(2) || "0.00"}
                </p>
              </div>
            </Card>

            {/* Status Card */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-4">Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Request</span>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                    {request.requestStatus}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Delivery</span>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                    {request.deliveryStatus}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Available Days */}
            {request.availableDays && request.availableDays.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Available Days
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {request.availableDays.includes("All Week") ? (
                    <Badge variant="secondary">All Week</Badge>
                  ) : (
                    request.availableDays.map((day) => (
                      <Badge key={day} variant="secondary" className="text-xs">{day}</Badge>
                    ))
                  )}
                </div>
              </Card>
            )}

            {/* Warehouse Assignment */}
            {(sourceIsSelfPickup || destinationIsSelfDelivery) && (
              <Card className="p-5 flex flex-col">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-primary" />
                  Warehouse Assignment
                </h3>
                <div className="space-y-4 flex-1">
                  {/* Source Warehouse */}
                  {sourceIsSelfPickup && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Source Warehouse (Pickup)
                      </p>
                      {request.sourceWarehouse ? (
                        <div className="bg-white dark:bg-slate-900/40 rounded p-2">
                          <p className="font-medium text-sm">{request.sourceWarehouse.name}</p>
                          <p className="text-xs text-muted-foreground">{request.sourceWarehouse.address}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <select
                            value={selectedSourceWarehouseId}
                            onChange={(e) => setSelectedSourceWarehouseId(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                          >
                            <option value="">Select warehouse...</option>
                            {warehouses.map((wh) => (
                              <option key={wh.id} value={wh.id}>
                                {wh.name} - {wh.city || wh.address}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleAssignWarehouse("source")}
                            disabled={assigningSourceWarehouse || !selectedSourceWarehouseId}
                          >
                            {assigningSourceWarehouse ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Assign"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Destination Warehouse */}
                  {destinationIsSelfDelivery && (
                    <div className="bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                      <p className="text-xs font-medium text-purple-800 dark:text-purple-200 mb-2">
                        Destination Warehouse (Delivery)
                      </p>
                      {request.destinationWarehouse ? (
                        <div className="bg-white dark:bg-slate-900/40 rounded p-2">
                          <p className="font-medium text-sm">{request.destinationWarehouse.name}</p>
                          <p className="text-xs text-muted-foreground">{request.destinationWarehouse.address}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <select
                            value={selectedDestinationWarehouseId}
                            onChange={(e) => setSelectedDestinationWarehouseId(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background"
                          >
                            <option value="">Select warehouse...</option>
                            {warehouses.map((wh) => (
                              <option key={wh.id} value={wh.id}>
                                {wh.name} - {wh.city || wh.address}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleAssignWarehouse("destination")}
                            disabled={assigningDestinationWarehouse || !selectedDestinationWarehouseId}
                          >
                            {assigningDestinationWarehouse ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Assign"
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {warehouses.length === 0 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-muted-foreground mb-2">No warehouses registered</p>
                      <Button size="sm" variant="outline" onClick={() => router.push("/company/warehouses")}>
                        <Warehouse className="w-3 h-3 mr-1" />
                        Add Warehouse
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
