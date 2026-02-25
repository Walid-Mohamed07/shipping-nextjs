"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
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
  PackageCheck,
  Navigation,
  Building2,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface Location {
  country: string;
  city: string;
  street: string;
  district?: string;
  pickupMode?: string;
}

interface CompanyWarehouse {
  id: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
}

interface Request {
  id: string;
  userId: string;
  user: { id: string; fullName: string; email: string; mobile?: string };
  source: Location;
  destination: Location;
  items: any[];
  requestStatus: string;
  deliveryStatus: string;
  createdAt: string;
  availableDays?: string[];
  sourcePickupMode?: string;
  destinationPickupMode?: string;
  assignedCompanyId?: string;
  assignedWarehouseId?: string;
  assignedWarehouse?: CompanyWarehouse;
  sourceWarehouse?: CompanyWarehouse & { assignedAt?: string };
  destinationWarehouse?: CompanyWarehouse & { assignedAt?: string };
  selectedCompany?: {
    name: string;
    rate: string;
    cost: number;
  };
}

export default function OngoingRequestDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const requestId = params?.id as string;

  const [request, setRequest] = useState<Request | null>(null);
  const [warehouses, setWarehouses] = useState<CompanyWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningSourceWarehouse, setAssigningSourceWarehouse] =
    useState(false);
  const [assigningDestinationWarehouse, setAssigningDestinationWarehouse] =
    useState(false);
  const [selectedSourceWarehouseId, setSelectedSourceWarehouseId] =
    useState("");
  const [selectedDestinationWarehouseId, setSelectedDestinationWarehouseId] =
    useState("");
  const [updatingDeliveryStatus, setUpdatingDeliveryStatus] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");

  useEffect(() => {
    if (!user || user.role !== "company") {
      router.push("/");
      return;
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, requestId]);

  const fetchData = async () => {
    if (!user?.id || !requestId) return;
    try {
      setLoading(true);

      // Fetch the specific request
      const [requestsRes, warehousesRes] = await Promise.all([
        fetch(`/api/company/ongoing/${requestId}?companyId=${user.id}`),
        fetch(`/api/company/warehouses?companyId=${user.id}`),
      ]);

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        if (data.request) {
          setRequest(data.request);
        } else {
          router.push("/company/ongoing");
        }
      } else if (requestsRes.status === 404) {
        router.push("/company/ongoing");
      }

      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      router.push("/company/ongoing");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignWarehouse = async (
    warehouseType: "source" | "destination",
  ) => {
    const warehouseId =
      warehouseType === "source"
        ? selectedSourceWarehouseId
        : selectedDestinationWarehouseId;
    const setAssigning =
      warehouseType === "source"
        ? setAssigningSourceWarehouse
        : setAssigningDestinationWarehouse;

    if (!warehouseId) {
      alert("Please select a warehouse");
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
        const locationLabel =
          warehouseType === "source" ? "pickup" : "delivery";
        alert(
          `Warehouse assigned successfully! The client has been notified of the ${locationLabel} location.`,
        );
        await fetchData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to assign warehouse");
      }
    } catch (error) {
      console.error("Failed to assign warehouse:", error);
      alert("Failed to assign warehouse");
    } finally {
      setAssigning(false);
    }
  };

  const needsSourceWarehouseAssignment = (req: Request | null) => {
    if (!req) return false;
    const sourceIsSelfPickup =
      req.sourcePickupMode === "Self" || req.source?.pickupMode === "Self";
    return sourceIsSelfPickup && !req.sourceWarehouse;
  };

  const needsDestinationWarehouseAssignment = (req: Request | null) => {
    if (!req) return false;
    const destinationIsSelfDelivery =
      req.destinationPickupMode === "Self" ||
      req.destination?.pickupMode === "Self";
    return destinationIsSelfDelivery && !req.destinationWarehouse;
  };

  const needsWarehouseAssignment = (req: Request | null) => {
    return (
      needsSourceWarehouseAssignment(req) ||
      needsDestinationWarehouseAssignment(req)
    );
  };

  // Delivery Status Management
  const DELIVERY_STATUSES = [
    { key: "Pending", label: "Pending", icon: Clock },
    { key: "Picked Up Source", label: "Picked Up", icon: Package },
    { key: "Warehouse Source Received", label: "At Source Warehouse", icon: Building2 },
    { key: "In Transit", label: "In Transit", icon: Truck },
    { key: "Warehouse Destination Received", label: "At Destination Warehouse", icon: Building2 },
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
    const sourceMode = req.sourcePickupMode || req.source?.pickupMode || "Delegate";
    const destMode = req.destinationPickupMode || req.destination?.pickupMode || "Delegate";
    
    const actions: { status: string; label: string; description: string; icon: any; variant: "default" | "outline" }[] = [];
    
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
          description: "Items are leaving warehouse and in transit to destination",
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
        alert(`✓ ${data.message}`);
        setDeliveryNote("");
        await fetchData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to update delivery status");
      }
    } catch (error) {
      console.error("Failed to update delivery status:", error);
      alert("Failed to update delivery status");
    } finally {
      setUpdatingDeliveryStatus(false);
    }
  };

  if (!user || user.role !== "company") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">
            Access denied. This page is for companies only.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">Request not found</p>
        </div>
      </div>
    );
  }

  const sourceIsSelfPickup =
    request.sourcePickupMode === "Self" ||
    request.source?.pickupMode === "Self";
  const destinationIsSelfDelivery =
    request.destinationPickupMode === "Self" ||
    request.destination?.pickupMode === "Self";
  const needsWarehouse = needsWarehouseAssignment(request);
  const needsSourceWarehouse = needsSourceWarehouseAssignment(request);
  const needsDestWarehouse = needsDestinationWarehouseAssignment(request);

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/company/ongoing")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ongoing Requests
        </Button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-foreground">
              Request #{request.id.slice(0, 8)}
            </h1>
            <span className="text-sm px-3 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
              Ongoing
            </span>
            {needsSourceWarehouse && (
              <span className="text-sm px-3 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                ⚠️ Source Warehouse Required
              </span>
            )}
            {needsDestWarehouse && (
              <span className="text-sm px-3 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                ⚠️ Destination Warehouse Required
              </span>
            )}
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Created: {new Date(request.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Location Details */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Route Details</h2>
              <div className="space-y-4">
                {/* Source */}
                <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-green-500">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold">Pickup Location</h3>
                  </div>
                  <div className="space-y-1 ml-7">
                    <p className="font-medium text-lg">
                      {request.source.city}, {request.source.country}
                    </p>
                    <p className="text-muted-foreground">
                      {request.source.street}
                    </p>
                    {request.source.district && (
                      <p className="text-sm text-muted-foreground">
                        District: {request.source.district}
                      </p>
                    )}
                    {sourceIsSelfPickup && (
                      <div className="mt-2">
                        <span className="text-sm px-2 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                          <Truck className="w-3 h-3 inline mr-1" />
                          Self Pickup Mode
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination */}
                <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-red-500">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-red-500" />
                    <h3 className="font-semibold">Delivery Location</h3>
                  </div>
                  <div className="space-y-1 ml-7">
                    <p className="font-medium text-lg">
                      {request.destination.city}, {request.destination.country}
                    </p>
                    <p className="text-muted-foreground">
                      {request.destination.street}
                    </p>
                    {request.destination.district && (
                      <p className="text-sm text-muted-foreground">
                        District: {request.destination.district}
                      </p>
                    )}
                    {destinationIsSelfDelivery && (
                      <div className="mt-2">
                        <span className="text-sm px-2 py-1 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">
                          <Truck className="w-3 h-3 inline mr-1" />
                          Self Delivery Mode
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Items */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">
                  Items ({request.items.length})
                </h2>
              </div>
              <div className="space-y-3">
                {request.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between bg-muted/50 rounded-lg p-4"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {item.name || item.item || `Item ${index + 1}`}
                      </p>
                      {item.category && (
                        <p className="text-sm text-muted-foreground">
                          Category: {item.category}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        {item.weight && <span>Weight: {item.weight} kg</span>}
                        {item.quantity && <span>Qty: {item.quantity}</span>}
                        {item.dimensions && (
                          <span>Dimensions: {item.dimensions}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Information */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold">Client Info</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {request.user?.fullName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </p>
                  <p className="font-medium text-sm break-all">
                    {request.user?.email || "N/A"}
                  </p>
                </div>
                {request.user?.mobile && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Phone
                    </p>
                    <p className="font-medium">{request.user.mobile}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Financial Info */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Financial Details</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Your Offer</span>
                  <span className="text-2xl font-bold text-primary">
                    ${request.selectedCompany?.cost.toFixed(2)}
                  </span>
                </div>
                {request.selectedCompany?.rate && (
                  <p className="text-sm text-muted-foreground">
                    Rate: {request.selectedCompany.rate}
                  </p>
                )}
              </div>
            </Card>

            {/* Status */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Status</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Request Status
                  </p>
                  <p className="font-medium capitalize">
                    {request.requestStatus}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Delivery Status
                  </p>
                  <p className="font-medium capitalize">
                    {request.deliveryStatus}
                  </p>
                </div>
              </div>
            </Card>

            {/* Available Days */}
            {request.availableDays && request.availableDays.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Available Days</h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {request.availableDays.includes("All Week") ? (
                    <span className="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      All Week
                    </span>
                  ) : (
                    request.availableDays.map((day) => (
                      <span
                        key={day}
                        className="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      >
                        {day}
                      </span>
                    ))
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="space-y-6 mt-6">
          {/* Delivery Action Center */}
          <Card className="p-6 border-2 border-primary/20">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Delivery Action Center</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage shipment progress and update delivery status
                  </p>
                </div>
              </div>

              {/* Current Status Display */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">
                    Current Status
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Step {getCurrentStatusIndex(request.deliveryStatus || "Pending") + 1} of {DELIVERY_STATUSES.length}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="relative mb-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                      style={{
                        width: `${((getCurrentStatusIndex(request.deliveryStatus || "Pending") + 1) / DELIVERY_STATUSES.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="flex justify-between mb-6 overflow-x-auto py-2">
                  {DELIVERY_STATUSES.map((status, index) => {
                    const StatusIcon = status.icon;
                    const currentIndex = getCurrentStatusIndex(request.deliveryStatus || "Pending");
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    
                    return (
                      <div
                        key={status.key}
                        className={`flex flex-col items-center min-w-[80px] ${
                          isCurrent ? "scale-110" : ""
                        }`}
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

                {/* Current Status Badge */}
                <div className="bg-primary/5 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const currentStatus = DELIVERY_STATUSES.find(
                        (s) => s.key === (request.deliveryStatus || "Pending")
                      );
                      const Icon = currentStatus?.icon || Clock;
                      return (
                        <>
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Current Status
                            </p>
                            <p className="text-lg font-bold text-foreground">
                              {currentStatus?.label || request.deliveryStatus}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Available Actions */}
              {request.deliveryStatus !== "Delivered" ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Available Actions
                  </h3>
                  
                  {getAvailableActions(request).length > 0 ? (
                    <div className="space-y-3">
                      {getAvailableActions(request).map((action) => {
                        const ActionIcon = action.icon;
                        return (
                          <div
                            key={action.status}
                            className="bg-muted/50 rounded-lg p-4 border border-border"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <ActionIcon className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground mb-1">
                                  {action.label}
                                </h4>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {action.description}
                                </p>
                                
                                {/* Optional Note */}
                                <div className="mb-3">
                                  <input
                                    type="text"
                                    placeholder="Add a note (optional)..."
                                    value={deliveryNote}
                                    onChange={(e) => setDeliveryNote(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                                  />
                                </div>
                                
                                <Button
                                  onClick={() => handleUpdateDeliveryStatus(action.status)}
                                  disabled={updatingDeliveryStatus}
                                  className="w-full sm:w-auto"
                                >
                                  {updatingDeliveryStatus ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Updating...
                                    </>
                                  ) : (
                                    <>
                                      <ActionIcon className="w-4 h-4 mr-2" />
                                      {action.label}
                                    </>
                                  )}
                                </Button>
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
                          <p className="font-medium text-yellow-800 dark:text-yellow-200">
                            Action Required
                          </p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            {needsSourceWarehouseAssignment(request) && needsDestinationWarehouseAssignment(request)
                              ? "Please assign both source and destination warehouses before updating delivery status."
                              : needsSourceWarehouseAssignment(request)
                              ? "Please assign a source warehouse first before updating delivery status."
                              : needsDestinationWarehouseAssignment(request)
                              ? "Please assign a destination warehouse before updating delivery status."
                              : "Complete the required setup to proceed with delivery."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-2">
                    Delivery Completed
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    This shipment has been successfully delivered to the customer.
                  </p>
                </div>
              )}
            </Card>

            {/* Warehouse Assignment Sections */}
            {(sourceIsSelfPickup || destinationIsSelfDelivery) && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Warehouse className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold">Warehouse Assignments</h2>
                </div>

                <Accordion type="single" defaultValue={sourceIsSelfPickup ? "source" : "destination"} className="space-y-3">
                  {/* Source Warehouse Assignment */}
                  {sourceIsSelfPickup && (
                    <AccordionItem value="source" className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                      <AccordionTrigger value="source" className="bg-transparent">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Warehouse className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-foreground">Source Warehouse (Pickup)</p>
                            {request.sourceWarehouse && (
                              <p className="text-xs text-muted-foreground">{request.sourceWarehouse.name}</p>
                            )}
                            {!request.sourceWarehouse && (
                              <p className="text-xs text-orange-600 dark:text-orange-400">⚠️ Not Assigned</p>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent value="source" className="bg-white/50 dark:bg-gray-900/50">

                        {request.sourceWarehouse ? (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-3">
                              ✓ Warehouse Assigned
                            </p>
                            <p className="font-semibold text-lg">
                              {request.sourceWarehouse.name}
                            </p>
                            <p className="text-muted-foreground mt-1">
                              {request.sourceWarehouse.address}
                            </p>
                            {request.sourceWarehouse.city && (
                              <p className="text-muted-foreground">
                                {request.sourceWarehouse.city}
                                {request.sourceWarehouse.country &&
                                  `, ${request.sourceWarehouse.country}`}
                              </p>
                            )}
                            {request.sourceWarehouse.assignedAt && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Assigned:{" "}
                                {new Date(
                                  request.sourceWarehouse.assignedAt,
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                              <p className="text-sm text-orange-800 dark:text-orange-200">
                                ⚠️ This is a self-pickup request. Please assign one of
                                your warehouses as the pickup location so the client
                                knows where to collect their shipment.
                              </p>
                            </div>

                            {warehouses.length === 0 ? (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                                  You don't have any warehouses registered. Please add a
                                  warehouse first.
                                </p>
                                <Button
                                  onClick={() => router.push("/company/warehouses")}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Warehouse className="w-4 h-4 mr-2" />
                                  Add Warehouse
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <label className="block text-sm font-medium">
                                  Select Warehouse
                                </label>
                                <select
                                  value={selectedSourceWarehouseId}
                                  onChange={(e) =>
                                    setSelectedSourceWarehouseId(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                                >
                                  <option value="">Select a warehouse...</option>
                                  {warehouses.map((wh) => (
                                    <option key={wh.id} value={wh.id}>
                                      {wh.name} - {wh.address}
                                      {wh.city && `, ${wh.city}`}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  onClick={() => handleAssignWarehouse("source")}
                                  disabled={
                                    assigningSourceWarehouse ||
                                    !selectedSourceWarehouseId
                                  }
                                  className="w-full"
                                >
                                  {assigningSourceWarehouse ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Assigning...
                                    </>
                                  ) : (
                                    <>
                                      <Warehouse className="w-4 h-4 mr-2" />
                                      Assign Source Warehouse
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Destination Warehouse Assignment */}
                  {destinationIsSelfDelivery && (
                    <AccordionItem value="destination" className="bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800">
                      <AccordionTrigger value="destination" className="bg-transparent">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <Warehouse className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-foreground">Destination Warehouse (Delivery)</p>
                            {request.destinationWarehouse && (
                              <p className="text-xs text-muted-foreground">{request.destinationWarehouse.name}</p>
                            )}
                            {!request.destinationWarehouse && (
                              <p className="text-xs text-purple-600 dark:text-purple-400">⚠️ Not Assigned</p>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent value="destination" className="bg-white/50 dark:bg-gray-900/50">

                        {request.destinationWarehouse ? (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-3">
                              ✓ Warehouse Assigned
                            </p>
                            <p className="font-semibold text-lg">
                              {request.destinationWarehouse.name}
                            </p>
                            <p className="text-muted-foreground mt-1">
                              {request.destinationWarehouse.address}
                            </p>
                            {request.destinationWarehouse.city && (
                              <p className="text-muted-foreground">
                                {request.destinationWarehouse.city}
                                {request.destinationWarehouse.country &&
                                  `, ${request.destinationWarehouse.country}`}
                              </p>
                            )}
                            {request.destinationWarehouse.assignedAt && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Assigned:{" "}
                                {new Date(
                                  request.destinationWarehouse.assignedAt,
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                              <p className="text-sm text-purple-800 dark:text-purple-200">
                                ⚠️ This is a self-delivery request. Please assign one of
                                your warehouses as the delivery location so the client
                                knows where to receive their shipment.
                              </p>
                            </div>

                            {warehouses.length === 0 ? (
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                                  You don't have any warehouses registered. Please add a
                                  warehouse first.
                                </p>
                                <Button
                                  onClick={() => router.push("/company/warehouses")}
                                  variant="outline"
                                  size="sm"
                                >
                                  <Warehouse className="w-4 h-4 mr-2" />
                                  Add Warehouse
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <label className="block text-sm font-medium">
                                  Select Warehouse
                                </label>
                                <select
                                  value={selectedDestinationWarehouseId}
                                  onChange={(e) =>
                                    setSelectedDestinationWarehouseId(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                                >
                                  <option value="">Select a warehouse...</option>
                                  {warehouses.map((wh) => (
                                    <option key={wh.id} value={wh.id}>
                                      {wh.name} - {wh.address}
                                      {wh.city && `, ${wh.city}`}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  onClick={() => handleAssignWarehouse("destination")}
                                  disabled={
                                    assigningDestinationWarehouse ||
                                    !selectedDestinationWarehouseId
                                  }
                                  className="w-full"
                                >
                                  {assigningDestinationWarehouse ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Assigning...
                                    </>
                                  ) : (
                                    <>
                                      <Warehouse className="w-4 h-4 mr-2" />
                                      Assign Destination Warehouse
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </Card>
            )}
        </div>
      </main>
    </div>
  );
}
