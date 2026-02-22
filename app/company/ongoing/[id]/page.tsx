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
} from "lucide-react";

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
  user: { id: string; fullName: string; email: string; phone?: string };
  source: Location;
  destination: Location;
  items: any[];
  requestStatus: string;
  deliveryStatus: string;
  createdAt: string;
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

      // Fetch all ongoing requests and filter for this one
      const requestsRes = await fetch(
        `/api/company/ongoing?companyId=${user.id}`,
      );
      const warehousesRes = await fetch(
        `/api/company/warehouses?companyId=${user.id}`,
      );

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        const foundRequest = data.requests?.find(
          (r: Request) => r.id === requestId,
        );
        if (foundRequest) {
          setRequest(foundRequest);
        } else {
          router.push("/company/ongoing");
        }
      }

      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
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
                        {item.description || `Item ${index + 1}`}
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
                          <span>
                            Dimensions: {item.dimensions.length} ×{" "}
                            {item.dimensions.width} × {item.dimensions.height}{" "}
                            cm
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Source Warehouse Assignment */}
            {sourceIsSelfPickup && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Warehouse className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-bold">
                    Source Warehouse (Pickup)
                  </h2>
                </div>

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
              </Card>
            )}

            {/* Destination Warehouse Assignment */}
            {destinationIsSelfDelivery && (
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Warehouse className="w-5 h-5 text-purple-500" />
                  <h2 className="text-xl font-bold">
                    Destination Warehouse (Delivery)
                  </h2>
                </div>

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
              </Card>
            )}
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
                {request.user?.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Phone
                    </p>
                    <p className="font-medium">{request.user.phone}</p>
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
          </div>
        </div>
      </main>
    </div>
  );
}
