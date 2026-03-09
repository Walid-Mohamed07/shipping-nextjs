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
import { useTranslation } from "@/app/context/LocaleContext";
import { useCurrency } from "@/app/context/CurrencyContext";

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
  const { t } = useTranslation();
  const { convert } = useCurrency();

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // For ongoing requests, pass user.id (for company role, user.id is the company ID)
      // For warehouses, same pattern
      const companyId = user.id || user._id;
      const requestsRes = await fetch(
        `/api/company/ongoing?companyId=${companyId}`,
      );
      const warehousesRes = await fetch(
        `/api/company/warehouses?companyId=${companyId}`,
      );

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        console.log(
          "[Ongoing] Fetched requests:",
          data.requests?.length || 0,
          "companyId used:",
          companyId,
        );
        setRequests(data.requests || []);
      } else {
        const errorData = await requestsRes.json();
        console.error("[Ongoing] Failed to fetch ongoing requests:", errorData);
      }

      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        setWarehouses(data.warehouses || []);
      } else {
        console.error(
          "Failed to fetch warehouses:",
          await warehousesRes.json(),
        );
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
      alert(t.company.pleaseSelectWarehouse);
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
        alert(t.company.warehouseAssignedMsg);
        await fetchData();
      } else {
        const errorData = await response.json();
        alert(errorData.error || t.company.failedAssignWarehouse);
      }
    } catch (error) {
      console.error("Failed to assign warehouse:", error);
      alert(t.company.failedAssignWarehouse);
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
            {t.company.accessDeniedCompany}
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
            {t.company.ongoingRequests}
          </h1>
          <p className="text-muted-foreground">
            {t.company.manageOngoingRequests}
          </p>
        </div>

        {requests.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t.company.noOngoingRequests}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t.company.submitOffers}
            </p>
            <Button
              onClick={() => router.push("/company/requests")}
              className="mt-4"
            >
              {t.company.browseAvailableRequests}
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

              const requestId = request._id || request.id || "";
              return (
                <Card
                  key={requestId}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/company/ongoing/${requestId}`)}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{request.publicId}</h3>
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                        {t.company.ongoingBadge}
                      </span>
                    </div>

                    {needsWarehouse && (
                      <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200 inline-block">
                        ⚠️ {t.company.actionRequired}
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
                            {request.items.length} {t.common.items}
                        </span>
                        {(sourceIsSelfPickup || destinationIsSelfDelivery) && (
                          <span className="text-xs text-orange-600 dark:text-orange-400">
                            <Truck className="w-3 h-3 inline" />{" "}
                            {sourceIsSelfPickup && t.company.selfPickup}
                            {sourceIsSelfPickup &&
                              destinationIsSelfDelivery &&
                              "/"}
                            {destinationIsSelfDelivery && t.company.selfDelivery}
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
                          {convert(request.selectedCompany?.cost || 0, request.selectedCompany?.currency || "USD").formatted}
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
                              {t.company.sourceWarehouseLabel} {request.sourceWarehouse.name}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-orange-600 dark:text-orange-400">
                              <Warehouse className="w-3 h-3 inline mr-1" />
                              {t.company.noSourceWarehouse}
                            </div>
                          ))}
                        {destinationIsSelfDelivery &&
                          (request.destinationWarehouse ? (
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <Warehouse className="w-3 h-3" />
                              <span className="truncate">
                              {t.company.destWarehouseLabel} {request.destinationWarehouse.name}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs text-purple-600 dark:text-purple-400">
                              <Warehouse className="w-3 h-3 inline mr-1" />
                              {t.company.noDestWarehouse}
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
