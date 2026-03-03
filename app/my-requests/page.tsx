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
  BoxSelect,
} from "lucide-react";
import { Request, Address, Item } from "@/types";
import { RequestCardSkeleton } from "@/app/components/loaders";
import { useTranslation } from "@/app/context/LocaleContext";

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
            <p className="text-muted-foreground">
              {t.myRequests.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refresh()} className="gap-2 cursor-pointer">
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
                  <div className="h-96 flex flex-col bg-card rounded-lg border border-border hover:border-primary transition-colors p-6 cursor-pointer hover:shadow-md">
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

                    {/* Items preview - fixed height */}
                    <div className="h-18 mb-4 bg-muted/50 rounded-lg p-3 overflow-hidden">
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

                    {/* Services badges - fixed height */}
                    <div className="h-6 flex flex-wrap gap-1.5 mb-4 overflow-hidden">
                      {request.items?.some(
                        (item: Item) =>
                          item.services?.canBeAssembledDisassembled ||
                          item.services?.assemblyDisassembly,
                      ) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Wrench className="w-3 h-3" />
                          {t.myRequests.assembly}
                        </span>
                      )}
                      {request.items?.some(
                        (item: Item) => item.services?.packaging,
                      ) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <BoxSelect className="w-3 h-3" />
                          {t.myRequests.packaging}
                        </span>
                      )}
                    </div>

                    {/* Main info - flex grow to fill space */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                          {formatLocation(request.from ?? request.source)} →{" "}
                          {formatLocation(request.to ?? request.destination)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>
                          {request.deliveryType === "Urgent"
                            ? t.myRequests.urgentDelivery
                            : t.myRequests.normalDelivery}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Banknote className="w-4 h-4 shrink-0" />
                        {request.selectedCompany ? (
                          <>
                            <span className="font-semibold text-primary">
                              ${Number(request.selectedCompany.finalPrice ?? request.selectedCompany.cost).toFixed(2)}
                            </span>
                            <span className="text-xs text-green-600 dark:text-green-400">({t.myRequests.accepted})</span>
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-foreground">
                              {request.primaryCost && Number(request.primaryCost) > 0
                                ? `$${Number(request.primaryCost).toFixed(2)}`
                                : request.cost && Number(request.cost) > 0
                                  ? `$${Number(request.cost).toFixed(2)}`
                                  : "N/A"}
                            </span>
                            <span className="text-xs">({t.myRequests.estimated})</span>
                          </>
                        )}
                      </div>
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
