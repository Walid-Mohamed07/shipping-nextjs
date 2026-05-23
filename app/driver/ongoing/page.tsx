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
  CheckCircle,
  Truck,
  User as UserIcon,
} from "lucide-react";
import { Request } from "@/types";
import { useTranslation } from "@/app/context/LocaleContext";
import { useCurrency } from "@/app/context/CurrencyContext";

export default function DriverOngoingRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { convert } = useCurrency();

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // For ongoing requests, pass user.id (for driver role, user.id is the driver ID)
      const driverId = user.id || user._id;
      const requestsRes = await fetch(
        `/api/driver/ongoing?driverId=${driverId}`,
      );

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        console.log(
          "[Ongoing] Fetched requests:",
          data.requests?.length || 0,
          "driverId used:",
          driverId,
        );
        setRequests(data.requests || []);
      } else {
        const errorData = await requestsRes.json();
        console.error("[Ongoing] Failed to fetch ongoing requests:", errorData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      router.push("/");
      return;
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  if (!user || user.role !== "driver") {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">{t.driver.accessDeniedDriver}</p>
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
            {t.driver.ongoingRequests}
          </h1>
          <p className="text-muted-foreground">
            {t.driver.manageOngoingRequests}
          </p>
        </div>

        {requests.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t.driver.noOngoingRequests}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t.driver.submitOffers}
            </p>
            <Button
              onClick={() => router.push("/driver/requests")}
              className="mt-4"
            >
              {t.driver.browseAvailableRequests}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((request) => {
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
                  onClick={() => router.push(`/driver/ongoing/${requestId}`)}
                >
                  <div className="space-y-3">
                    {/* Header */}

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
                            {sourceIsSelfPickup && t.driver.selfPickup}
                            {sourceIsSelfPickup &&
                              destinationIsSelfDelivery &&
                              "/"}
                            {destinationIsSelfDelivery && t.driver.selfDelivery}
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
                          {
                            convert(
                              request.selectedDriver?.cost || 0,
                              request.selectedDriver?.currency || "USD",
                            ).formatted
                          }
                        </span>
                      </div>
                    </div>
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
