"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useLiveCompanyRequests, useLiveEvent } from "@/app/hooks/useLiveData";
import { toast } from "sonner";
import Link from "next/link";
import {
  MapPin,
  Package,
  DollarSign,
  Loader2,
  Scale,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  ArrowRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Request } from "@/types";
import { RequestCardSkeleton } from "@/app/components/loaders";
import { AuthGuard } from "@/app/components/AuthGuard";
import { useTranslation } from "@/app/context/LocaleContext";
import { PriceDisplay } from "@/app/components/PriceDisplay";

export default function CompanyRequestsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Use live data hook for real-time updates
  const {
    data: requests,
    isLoading: requestsLoading,
    refresh,
    isConnected,
  } = useLiveCompanyRequests(user?.id);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDeliveryStatus, setFilterDeliveryStatus] =
    useState<string>("all");
  const [filterPickupMode, setFilterPickupMode] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const loading = isLoading || requestsLoading;
  const { t } = useTranslation();

  const translateStatus = (status: string): string => {
    const statuses = t.userRequestDetail.requestStatuses as Record<string, string>;
    return statuses[status] || status;
  };

  const translateOfferStatus = (status: string): string => {
    const map: Record<string, string> = {
      pending: t.company.offerStatusPending,
      accepted: t.company.offerStatusAccepted,
      rejected: t.company.offerStatusRejected,
    };
    return map[status?.toLowerCase()] || status;
  };

  // Show toast notifications for real-time events
  useLiveEvent(
    ["REQUEST_CREATED", "OFFER_ACCEPTED", "OFFER_REJECTED", "STATUS_CHANGED"],
    (event) => {
      if (event.type === "REQUEST_CREATED") {
        toast.info("New request available!", {
          description: "A new shipping request has been posted",
          action: {
            label: "View",
            onClick: () =>
              (window.location.href = `/company/requests/${event.payload.id || event.requestId}`),
          },
        });
      } else if (
        event.type === "OFFER_ACCEPTED" &&
        event.payload.companyId === user?.id
      ) {
        toast.success("Your offer was accepted!", {
          description: event.payload.message || "Check your ongoing requests",
        });
      }
    },
  );

  useEffect(() => {
    if (isLoading) {
      return; // Wait for auth to load
    }
    if (!user || user.role !== "company") {
      router.push("/");
      return;
    }
  }, [user?.id, user?.role, isLoading, router]);

  const getMyOffer = (request: Request) => {
    return request.costOffers?.find((offer) => offer.company.id === user?.id);
  };

  // Filter and paginate requests
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    return requests.filter((request: Request) => {
      const matchesSearch =
        searchTerm === "" ||
        (request.id || request._id)
          .toString()
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (typeof request.user === "object" &&
          request.user?.fullName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()));

      const matchesStatus =
        filterStatus === "all" || request.requestStatus === filterStatus;

      const matchesDeliveryStatus =
        filterDeliveryStatus === "all" ||
        request.deliveryStatus === filterDeliveryStatus;

      const matchesPickupMode =
        filterPickupMode === "all" ||
        request.sourcePickupMode === filterPickupMode ||
        request.destinationPickupMode === filterPickupMode;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDeliveryStatus &&
        matchesPickupMode
      );
    });
  }, [
    requests,
    searchTerm,
    filterStatus,
    filterDeliveryStatus,
    filterPickupMode,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  // Early return for loading state (after all hooks)
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthGuard requiredRole="company">
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {t.company.availableRequests}
            </h1>
            <p className="text-muted-foreground">
              {t.company.browseSubmitOffers}
            </p>
          </div>

          {/* Filter Section */}
          <Card className="p-4 mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t.company.filters}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {t.company.searchByIdOrCustomer}
                  </label>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  />
                </div>

                {/* Request Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {t.company.requestStatusFilter}
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  >
                    <option value="all">{t.company.allStatus}</option>
                    <option value="Pending">Pending</option>
                    <option value="Assigned">{t.company.assignedStatus}</option>
                    <option value="Action needed">Action Needed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Delivery Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {t.company.deliveryStatusFilter}
                  </label>
                  <select
                    value={filterDeliveryStatus}
                    onChange={(e) => {
                      setFilterDeliveryStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  >
                    <option value="all">{t.company.allStatus}</option>
                    <option value="pending">Pending</option>
                    <option value="in-transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Pickup Mode Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {t.company.pickupModeFilter}
                  </label>
                  <select
                    value={filterPickupMode}
                    onChange={(e) => {
                      setFilterPickupMode(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  >
                    <option value="all">{t.company.allModes}</option>
                    <option value="Self">{t.company.selfPickup}</option>
                    <option value="Delegate">{t.company.companyPickupMode}</option>
                  </select>
                </div>

                {/* Reset Filters */}
                <div className="flex items-end">
                  <Button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("all");
                      setFilterDeliveryStatus("all");
                      setFilterPickupMode("all");
                      setCurrentPage(1);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {t.company.resetFilters}
                  </Button>
                </div>
              </div>

              {/* Results Info */}
              <div className="text-xs text-muted-foreground">
                {t.common.showing}{" "}
                <span className="font-medium">{filteredRequests.length}</span>{" "}
                {t.common.of} <span className="font-medium">{requests?.length ?? 0}</span>{" "}
                {t.company.requestsLabel}
              </div>
            </div>
          </Card>

          {loading ? (
            <RequestCardSkeleton count={9} />
          ) : !requests || requests.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t.company.noAvailableRequests}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t.company.checkBackLater}
              </p>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {t.company.noMatchFilters}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {t.company.tryAdjustFilters}
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {paginatedRequests.map((request: Request) => {
                  const myOffer = getMyOffer(request);
                  const totalItems = request.items.reduce(
                    (sum: number, item: any) => sum + item.quantity,
                    0,
                  );
                  const totalWeight = request.items.reduce(
                    (sum: number, item: any) =>
                      sum + parseFloat(item.weight || "0") * item.quantity,
                    0,
                  );

                  return (
                    <Card
                      key={request.id || request._id}
                      className="group relative overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/50 hover:border-l-primary"
                    >
                      {/* Compact Header */}
                      <div className="px-4 py-3 border-b border-border bg-linear-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900/20">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-foreground text-sm">
                            {request.publicId}
                          </h3>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              className={`text-xs px-2 py-0.5 ${
                                request.requestStatus === "Pending"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40"
                                  : request.requestStatus === "Action needed"
                                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40"
                                    : "bg-green-100 text-green-800 dark:bg-green-900/40"
                              }`}
                            >
                              {translateStatus(request.requestStatus)}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.createdAt!).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Route Summary */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                              <span className="truncate font-medium">
                                {request.source.city}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                              <span className="truncate font-medium">
                                {request.destination.city}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>

                        {/* Quick Stats */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" />
                            {totalItems} {t.common.items}
                          </span>
                          <span className="flex items-center gap-1">
                            <Scale className="w-3.5 h-3.5" />
                            {totalWeight.toFixed(1)} kg
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {request.deliveryType === 'Urgent' ? t.newRequest.urgent : request.deliveryType === 'Normal' ? t.newRequest.normal : request.deliveryType}
                          </Badge>
                        </div>

                        {/* Estimated Cost */}
                        {/* TEMPORARILY HIDDEN - primaryCost
                        {request.primaryCost && (
                          <div className="pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{t.admin.estimatedCost}</span>
                              <PriceDisplay
                                amount={parseFloat(request.primaryCost)}
                                size="sm"
                                className="text-sm font-bold text-primary"
                              />
                            </div>
                          </div>
                        )}
                        */}

                        {/* Offer Status Indicator */}
                        {myOffer && (
                          <div
                            className={`text-xs px-2 py-1.5 rounded-md flex items-center justify-between ${
                              myOffer.status === "accepted"
                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                                : myOffer.status === "rejected"
                                  ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                                  : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {t.company.yourOfferLabel}:{" "}
                              <PriceDisplay
                                amount={myOffer.cost}
                                currency={(myOffer as any).currency}
                                size="sm"
                              />
                            </span>
                            <Badge
                              className={`text-xs ${
                                myOffer.status === "accepted"
                                  ? "bg-green-100 text-green-800"
                                  : myOffer.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {translateOfferStatus(myOffer.status)}
                            </Badge>
                          </div>
                        )}

                        {/* Action Button */}
                        <Link
                          href={`/company/requests/${request.id || request._id}`}
                          className="block"
                        >
                          <Button
                            variant={myOffer ? "outline" : "default"}
                            size="sm"
                            className="w-full gap-2 mt-2"
                          >
                            <Eye className="w-4 h-4" />
                            {myOffer ? t.company.viewDetails : t.company.viewMakeOffer}
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              <Card className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t.company.itemsPerPage}
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-xs border border-border rounded bg-background"
                    >
                      <option value={6}>6</option>
                      <option value={9}>9</option>
                      <option value={18}>18</option>
                      <option value={36}>36</option>
                    </select>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t.common.page}{" "}
                    <span className="font-medium">
                      {currentPage} {t.common.of} {totalPages === 0 ? 1 : totalPages}
                    </span>{" "}
                    • {t.common.total}:{" "}
                    <span className="font-medium">
                      {filteredRequests.length}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(totalPages || 1, prev + 1),
                        )
                      }
                      disabled={currentPage === totalPages || totalPages === 0}
                      variant="outline"
                      size="sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
