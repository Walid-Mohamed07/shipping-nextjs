"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/app/components/Header";
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
  user: { id: string; fullName: string; email: string };
  source: Location;
  destination: Location;
  items: any[];
  requestStatus: string;
  deliveryStatus: string;
  createdAt: string;
  sourcePickupMode?: string;
  assignedCompanyId?: string;
  assignedWarehouseId?: string;
  assignedWarehouse?: CompanyWarehouse;
  selectedCompany?: {
    name: string;
    rate: string;
    cost: number;
  };
}

export default function CompanyOngoingRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [warehouses, setWarehouses] = useState<CompanyWarehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningWarehouse, setAssigningWarehouse] = useState<string | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<{ [key: string]: string }>({});

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      
      // Fetch ongoing requests
      const requestsRes = await fetch(`/api/company/ongoing?companyId=${user.id}`);
      const warehousesRes = await fetch(`/api/company/warehouses?companyId=${user.id}`);
      
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
        alert("Warehouse assigned successfully! The client has been notified of the pickup location.");
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
    return sourceIsSelfPickup && !request.assignedWarehouseId;
  };

  if (!user || user.role !== "company") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

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
          <div className="space-y-4">
            {requests.map((request) => {
              const needsWarehouse = needsWarehouseAssignment(request);
              const sourceIsSelfPickup = 
                request.sourcePickupMode === "Self" || 
                request.source?.pickupMode === "Self";

              return (
                <Card key={request.id} className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-bold">
                          Request #{request.id.slice(0, 8)}
                        </h3>
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                          Ongoing
                        </span>
                        {needsWarehouse && (
                          <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                            Warehouse Assignment Required
                          </span>
                        )}
                      </div>

                      {/* Locations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-500" />
                            From (Source)
                          </p>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {request.source.city}, {request.source.country}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.source.street}
                            </p>
                            {sourceIsSelfPickup && (
                              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                                <Truck className="w-3 h-3 inline mr-1" />
                                Self Pickup
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" />
                            To (Destination)
                          </p>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {request.destination.city}, {request.destination.country}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {request.destination.street}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Items Summary */}
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground">
                          <Package className="w-4 h-4 inline mr-1" />
                          {request.items.length} item(s)
                        </p>
                      </div>

                      {/* Client Info */}
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-4 h-4" />
                          {request.user?.fullName || "User"}
                        </span>
                        <span>
                          Accepted offer: ${request.selectedCompany?.cost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Warehouse Assignment Section */}
                  {sourceIsSelfPickup && (
                    <div className="border-t border-border pt-4 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Warehouse className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold">Pickup Warehouse Assignment</h4>
                      </div>

                      {request.assignedWarehouse ? (
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                            ✓ Warehouse Assigned
                          </p>
                          <p className="font-medium">{request.assignedWarehouse.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.assignedWarehouse.address}
                            {request.assignedWarehouse.city && `, ${request.assignedWarehouse.city}`}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            This is a self-pickup request. Please assign one of your warehouses as the pickup location.
                          </p>
                          
                          {warehouses.length === 0 ? (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                You don't have any warehouses. Please add a warehouse first.
                              </p>
                              <Button
                                onClick={() => router.push("/company/warehouses")}
                                variant="outline"
                                size="sm"
                                className="mt-2"
                              >
                                Add Warehouse
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <select
                                value={selectedWarehouseId[request.id] || ""}
                                onChange={(e) => setSelectedWarehouseId({
                                  ...selectedWarehouseId,
                                  [request.id]: e.target.value,
                                })}
                                className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
                              >
                                <option value="">Select a warehouse...</option>
                                {warehouses.map((wh) => (
                                  <option key={wh.id} value={wh.id}>
                                    {wh.name} - {wh.address}
                                  </option>
                                ))}
                              </select>
                              <Button
                                onClick={() => handleAssignWarehouse(request.id)}
                                disabled={assigningWarehouse === request.id || !selectedWarehouseId[request.id]}
                              >
                                {assigningWarehouse === request.id ? "Assigning..." : "Assign"}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
