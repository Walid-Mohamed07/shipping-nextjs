"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { toast } from "sonner";
import Link from "next/link";
import {
  Package,
  ArrowRight,
  Calendar,
  MapPin,
  Banknote,
  Wrench,
  Tag,
  Truck,
  Users,
  Ruler,
  Scale,
} from "lucide-react";
import { Request, Address, Item } from "@/types";
import { RequestCardSkeleton } from "@/app/components/loaders";
import { useTranslation } from "@/app/context/LocaleContext";
import {
  LockedPriceDisplay,
  PriceDisplay,
} from "@/app/components/PriceDisplay";

// Haversine formula to compute distance in km between two lat/lng points
const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Helper to format a location object for display
const formatLocation = (loc: Address) => {
  if (!loc) return "-";

  const parts = [loc.country, loc.city].filter(Boolean);

  return parts.length ? parts.join(", ") : "-";
};

export default function MyRequestsPage() {
  const { user, isLoading: authLoading } = useProtectedRoute();
  const { t } = useTranslation();

  // Regular data fetching (not live)
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch requests data
  const fetchRequests = useCallback(async () => {
    if (!user?.id) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/requests?userId=${user.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
      toast.error("Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchRequests();
  }, [fetchRequests]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800";
      case "In Transit":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-800";
      case "Delivered":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-800";
      case "Cancelled":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-800";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-800";
    }
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400";
      case "Accepted":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Rejected":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
      case "Action needed":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 font-semibold";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {t.myRequests.title}
            </h1>
            <p className="text-muted-foreground">{t.myRequests.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => refresh()}
              className="gap-2 cursor-pointer"
            >
              {t.common.refresh}
            </Button>
            <Link href="/new-request">
              <Button className="gap-2 cursor-pointer">
                <Package className="w-4 h-4" />
                {t.myRequests.newRequest}
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {isLoading || authLoading ? (
          <RequestCardSkeleton count={3} />
        ) : !requests || requests.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {t.myRequests.noRequestsYet}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t.myRequests.createFirstRequest}
            </p>
            <Link href="/new-request">
              <Button className="cursor-pointer">
                {t.myRequests.createYourFirstRequest}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request: Request) => {
              // Get preview items (first 2 for consistent card height)
              const previewItems = (request.items || []).slice(0, 2);
              const remaining = Math.max(0, (request.items || []).length - 2);
              return (
                <Link key={request.id} href={`/request/${request.publicId}`}>
                  <div className="flex flex-col bg-card rounded-lg border border-border hover:border-primary transition-colors p-6 cursor-pointer hover:shadow-md">
                    {/* Header - fixed height */}
                    <div className="flex items-start justify-between mb-4 h-8">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {request.publicId}
                        </h3>
                      </div>
                      <div className="ml-2 shrink-0">
                        {request.requestStatus && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getRequestStatusColor(request.requestStatus)}`}
                          >
                            {request.requestStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="mb-3 bg-muted/50 rounded-lg p-3 overflow-hidden">
                      {previewItems.map((item: Item, idx: number) => (
                        <div
                          key={item._id || `item-${idx}`}
                          className="text-sm text-foreground truncate"
                        >
                          • {item.name || item.item}{" "}
                          {item.quantity > 1 ? `(×${item.quantity})` : ""}
                        </div>
                      ))}
                      {remaining > 0 && (
                        <div className="text-sm text-muted-foreground italic">
                          +{remaining} more item{remaining !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    {/* Categories */}
                    {(() => {
                      const cats = [
                        ...new Set(
                          (request.items || [])
                            .map((i) => i.category)
                            .filter(Boolean),
                        ),
                      ];
                      return cats.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap mb-3">
                          <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {cats.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}

                    {/* Main info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {formatLocation(request.from ?? request.source)} →{" "}
                          {formatLocation(request.to ?? request.destination)}
                        </span>
                        {(() => {
                          const src = request.from ?? request.source;
                          const dst = request.to ?? request.destination;
                          if (
                            src?.coordinates?.latitude != null &&
                            src?.coordinates?.longitude != null &&
                            dst?.coordinates?.latitude != null &&
                            dst?.coordinates?.longitude != null
                          ) {
                            const km = haversineKm(
                              src.coordinates.latitude,
                              src.coordinates.longitude,
                              dst.coordinates.latitude,
                              dst.coordinates.longitude,
                            );
                            return (
                              <span className="ml-auto shrink-0 flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                                <Ruler className="w-3 h-3" />
                                {t.myRequests.distance.replace(
                                  "{km}",
                                  String(Math.round(km)),
                                )}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>
                          {request.deliveryType === "Urgent"
                            ? t.myRequests.urgentDelivery
                            : request.deliveryType === "Scheduled" &&
                                request.scheduledDate
                              ? t.myRequests.scheduledDelivery.replace(
                                  "{date}",
                                  new Date(
                                    request.scheduledDate,
                                  ).toLocaleString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }),
                                )
                              : t.myRequests.normalDelivery}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Banknote className="w-4 h-4 shrink-0" />
                        {request.selectedDriver ? (
                          <>
                            <LockedPriceDisplay
                              pricing={(request as any).pricing}
                              fallbackAmount={Number(
                                request.selectedDriver.finalPrice ??
                                  request.selectedDriver.cost,
                              )}
                              className="font-semibold text-primary"
                              size="sm"
                            />
                            <span className="text-xs text-green-600 dark:text-green-400">
                              ({t.myRequests.accepted})
                            </span>
                          </>
                        ) : (
                          <>
                            {request.cost && Number(request.cost) > 0 ? (
                              <PriceDisplay
                                amount={Number(request.cost)}
                                className="font-medium text-foreground"
                                size="sm"
                              />
                            ) : (
                              <span className="font-medium text-foreground">
                                N/A
                              </span>
                            )}
                            <span className="text-xs">
                              ({t.myRequests.estimated})
                            </span>
                          </>
                        )}
                      </div>

                      {/* Vehicle, Workers, Weight */}
                      <div className="grid grid-cols-3 gap-2 text-xs bg-muted/30 rounded-lg p-2 -mx-2">
                        <div className="flex flex-col items-center gap-1 text-center">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground truncate w-full px-1">
                            {request.transportVehicle?.nameEn || "—"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center border-l border-r border-border/30">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {(request.workersCount ?? 0) > 0 ? request.workersCount : "—"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center">
                          <Scale className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {(() => {
                              const total = (request.items || []).reduce(
                                (sum: number, item: Item) =>
                                  sum + parseFloat(item.weight || "0") * item.quantity,
                                0,
                              );
                              return total > 0 ? `${total.toFixed(1)}kg` : "—";
                            })()}
                          </span>
                        </div>
                      </div>
                      {request.transportVehicle?.nameEn && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Truck className="w-4 h-4 shrink-0" />
                          <span className="truncate">
                            {request.transportVehicle.nameEn}
                          </span>
                        </div>
                      )}
                      {(request.needsWinchPickup ||
                        request.needsWinchDropoff) && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-700">
                            <Wrench className="w-3 h-3" />
                            {t.myRequests.winch}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer with date - fixed height */}
                    <div className="h-10 pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {request.createdAt
                          ? new Date(request.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
