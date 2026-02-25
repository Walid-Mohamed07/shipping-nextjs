"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Package,
  Loader2,
  Warehouse,
  CheckCircle,
  Truck,
  User as UserIcon,
} from "lucide-react";
import { Request } from "@/types";

interface CompanyWarehouse {
  id: string;
  name: string;
  address: string;
  city?: string;
  country?: string;
}

export default function CompanyOngoingRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [warehouses, setWarehouses] = useState<CompanyWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningWarehouse, setAssigningWarehouse] = useState<string | null>(
    null,
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<{
    [key: string]: string;
  }>({});

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // Fetch ongoing requests
      const requestsRes = await fetch(
        `/api/company/ongoing?companyId=${user.company}`,
      );
      const warehousesRes = await fetch(
        `/api/company/warehouses?companyId=${user.company}`,
      );

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
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
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.role !== "company") {
      router.push("/");
      return;
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const handleAssignWarehouse = async (requestId: string) => {
    const warehouseId = selectedWarehouseId[requestId];
    if (!warehouseId) {
      alert("Please select a warehouse");
      return;
    }

    try {
      setAssigningWarehouse(requestId);
      const response = await fetch("/api/company/assign-warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          companyId: user?.id,
          warehouseId,
        }),
      });

      if (response.ok) {
        alert(
          "Warehouse assigned successfully! The client has been notified of the pickup location.",
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
      setAssigningWarehouse(null);
    }
  };

  const needsWarehouseAssignment = (request: Request) => {
    const sourceIsSelfPickup =
      request.sourcePickupMode === "Self" ||
      request.source?.pickupMode === "Self";
    const destinationIsSelfDelivery =
      request.destinationPickupMode === "Self" ||
      request.destination?.pickupMode === "Self";

    const needsSourceWarehouse = sourceIsSelfPickup && !request.sourceWarehouse;
    const needsDestWarehouse =
      destinationIsSelfDelivery && !request.destinationWarehouse;

    return needsSourceWarehouse || needsDestWarehouse;
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

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Ongoing Requests
          </h1>
          <p className="text-muted-foreground">
            Manage ongoing requests assigned to your company
          </p>
        </div>

        {requests.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No ongoing requests at the moment
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Submit offers on available requests to get started
            </p>
            <Button
              onClick={() => router.push("/company/requests")}
              className="mt-4"
            >
              Browse Available Requests
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((request) => {
              const needsWarehouse = needsWarehouseAssignment(request);
              const sourceIsSelfPickup =
                request.sourcePickupMode === "Self" ||
                request.source?.pickupMode === "Self";
              const destinationIsSelfDelivery =
                request.destinationPickupMode === "Self" ||
                request.destination?.pickupMode === "Self";

              return (
                <Card
                  key={request.id}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/company/ongoing/${request.id}`)}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">
                        #{request._id.slice(0, 8)}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                        Ongoing
                      </span>
                    </div>

                    {needsWarehouse && (
                      <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 inline-block">
                        ⚠️ Action Required
                      </span>
                    )}

                    {/* Route Summary */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium truncate">
                            {request.source.city}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.source.country}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium truncate">
                            {request.destination.city}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.destination.country}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-1 pt-2 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Package className="w-3 h-3" />
                          {request.items.length} items
                        </span>
                        {(sourceIsSelfPickup || destinationIsSelfDelivery) && (
                          <span className="text-xs text-orange-600 dark:text-orange-400">
                            <Truck className="w-3 h-3 inline" /> Self{" "}
                            {sourceIsSelfPickup && "Pickup"}
                            {sourceIsSelfPickup &&
                              destinationIsSelfDelivery &&
                              "/"}
                            {destinationIsSelfDelivery && "Delivery"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <UserIcon className="w-3 h-3" />
                          {typeof request.user === "object" &&
                          request.user?.fullName
                            ? request.user.fullName
                            : "User"}
                        </span>
                        <span className="font-semibold text-primary">
                          ${request.selectedCompany?.cost.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Warehouse Status */}
                    {(sourceIsSelfPickup || destinationIsSelfDelivery) && (
                      <div className="pt-2 border-t border-border space-y-1">
                        {sourceIsSelfPickup &&
                          (request.sourceWarehouse ? (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <Warehouse className="w-3 h-3" />
                              <span className="truncate">
                                Source: {request.sourceWarehouse.name}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-orange-600 dark:text-orange-400">
                              <Warehouse className="w-3 h-3 inline mr-1" />
                              No source warehouse
                            </div>
                          ))}
                        {destinationIsSelfDelivery &&
                          (request.destinationWarehouse ? (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <Warehouse className="w-3 h-3" />
                              <span className="truncate">
                                Dest: {request.destinationWarehouse.name}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-purple-600 dark:text-purple-400">
                              <Warehouse className="w-3 h-3 inline mr-1" />
                              No destination warehouse
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
