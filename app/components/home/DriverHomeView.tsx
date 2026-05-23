"use client";

import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useLiveDriverRequests, useLiveEvent } from "@/app/hooks/useLiveData";
import { toast } from "sonner";
import Link from "next/link";
import {
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
  Users,
  Truck,
  Tag,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Request, Item } from "@/types";
import { RequestCardSkeleton } from "@/app/components/loaders";
import { useTranslation } from "@/app/context/LocaleContext";
import { PriceDisplay } from "@/app/components/PriceDisplay";

function formatScheduledDate(scheduledDate?: string, startTime?: string): string {
  if (!scheduledDate) return "";
  const date = new Date(scheduledDate);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = days[date.getDay()];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  if (!startTime) return `${dayName} - ${d}/${m}`;
  const [hStr, minStr] = startTime.split(":");
  const h = parseInt(hStr, 10);
  const min = minStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${dayName} - ${d}/${m} - ${h12}:${min} ${ampm}`;
}

export function DriverHomeView() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const {
    data: requests,
    isLoading: requestsLoading,
    refresh,
    isConnected,
  } = useLiveDriverRequests(user?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDeliveryStatus, setFilterDeliveryStatus] = useState<string>("all");
  const [filterPickupMode, setFilterPickupMode] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const loading = isLoading || requestsLoading;

  const translateStatus = (status: string): string => {
    const statuses = t.userRequestDetail.requestStatuses as Record<string, string>;
    return statuses[status] || status;
  };

  const translateOfferStatus = (status: string): string => {
    const map: Record<string, string> = {
      pending: t.driver.offerStatusPending,
      accepted: t.driver.offerStatusAccepted,
      rejected: t.driver.offerStatusRejected,
    };
    return map[status?.toLowerCase()] || status;
  };

  useLiveEvent(
    ["REQUEST_CREATED", "OFFER_ACCEPTED", "OFFER_REJECTED", "STATUS_CHANGED"],
    (event) => {
      if (event.type === "REQUEST_CREATED") {
        toast.info("New request available!", {
          description: "A new shipping request has been posted",
          action: {
            label: "View",
            onClick: () =>
              (window.location.href = `/driver/requests/${event.payload.id || event.requestId}`),
          },
        });
      } else if (
        event.type === "OFFER_ACCEPTED" &&
        event.payload.driverId === user?.id
      ) {
        toast.success("Your offer was accepted!", {
          description: event.payload.message || "Check your ongoing requests",
        });
      }
    },
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "driver") {
      router.push("/");
    }
  }, [user?.id, user?.role, isLoading, router]);

  const getMyOffer = (request: Request) =>
    request.costOffers?.find((offer) => offer.driver.id === user?.id);

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
          request.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        filterStatus === "all" || request.requestStatus === filterStatus;
      const matchesDeliveryStatus =
        filterDeliveryStatus === "all" || request.deliveryStatus === filterDeliveryStatus;
      const matchesPickupMode =
        filterPickupMode === "all" ||
        request.sourcePickupMode === filterPickupMode ||
        request.destinationPickupMode === filterPickupMode;
      return matchesSearch && matchesStatus && matchesDeliveryStatus && matchesPickupMode;
    });
  }, [requests, searchTerm, filterStatus, filterDeliveryStatus, filterPickupMode]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {t.driver.availableRequests}
          </h1>
          <p className="text-muted-foreground">{t.driver.browseSubmitOffers}</p>
        </div>

        {/* Filters - Horizontal Layout */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{t.driver.filters}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="border border-border rounded-lg p-4 bg-white dark:bg-slate-950/50">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t.driver.searchByIdOrCustomer}
              </label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
              />
            </div>

            {/* Status Filter */}
            <div className="border border-border rounded-lg p-4 bg-white dark:bg-slate-950/50">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t.driver.requestStatusFilter}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
              >
                <option value="all">{t.driver.allStatus}</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">{t.driver.assignedStatus}</option>
                <option value="Action needed">Action Needed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Delivery Status Filter */}
            <div className="border border-border rounded-lg p-4 bg-white dark:bg-slate-950/50">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t.driver.deliveryStatusFilter}
              </label>
              <select
                value={filterDeliveryStatus}
                onChange={(e) => { setFilterDeliveryStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
              >
                <option value="all">{t.driver.allStatus}</option>
                <option value="pending">Pending</option>
                <option value="in-transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Pickup Mode Filter */}
            <div className="border border-border rounded-lg p-4 bg-white dark:bg-slate-950/50">
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                {t.driver.pickupModeFilter}
              </label>
              <select
                value={filterPickupMode}
                onChange={(e) => { setFilterPickupMode(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
              >
                <option value="all">{t.driver.allModes}</option>
                <option value="Self">{t.driver.selfPickup}</option>
                <option value="Delegate">{t.driver.driverPickupMode}</option>
              </select>
            </div>
          </div>

          {/* Reset & Results Info */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {t.common.showing}{" "}
              <span className="font-medium">{filteredRequests.length}</span>{" "}
              {t.common.of}{" "}
              <span className="font-medium">{requests?.length ?? 0}</span>{" "}
              {t.driver.requestsLabel}
            </div>
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
            >
              {t.driver.resetFilters}
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <RequestCardSkeleton count={9} />
        ) : !requests || requests.length === 0 ? (
          <div className="border border-border rounded-lg p-12 text-center bg-white dark:bg-slate-950/50">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t.driver.noAvailableRequests}</p>
            <p className="text-sm text-muted-foreground mt-2">{t.driver.checkBackLater}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="border border-border rounded-lg p-12 text-center bg-white dark:bg-slate-950/50">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t.driver.noMatchFilters}</p>
            <p className="text-sm text-muted-foreground mt-2">{t.driver.tryAdjustFilters}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {paginatedRequests.map((request: Request) => {
                const myOffer = getMyOffer(request);
                const totalItems = request.items.reduce(
                  (sum: number, item: Item) => sum + item.quantity, 0
                );
                const totalWeight = request.items.reduce(
                  (sum: number, item: Item) =>
                    sum + parseFloat(item.weight || "0") * item.quantity, 0
                );
                const firstItem = request.items[0];
                const extraItemsCount = request.items.length - 1;
                const itemName = firstItem?.name || firstItem?.item || "—";
                const itemCategory = firstItem?.category || "—";
                const needsWinch = request.needsWinchPickup || request.needsWinchDropoff;
                const workersCount = request.workersCount ?? 0;
                const vehicleName = request.transportVehicle?.nameEn || "—";

                const deliveryLabel =
                  request.deliveryType === "Urgent"
                    ? "Urgent"
                    : request.deliveryType === "Scheduled"
                      ? formatScheduledDate(request.scheduledDate, request.startTime)
                      : "Normal";

                return (
                  <div
                    key={request.id || request._id}
                    className="border border-border rounded-lg overflow-hidden bg-white dark:bg-slate-950/50 hover:border-primary/50 transition-colors flex flex-col"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-border/50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">
                            {request.publicId}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(request.createdAt!).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
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
                          {needsWinch && (
                            <Badge className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                              🔧 Winch
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col">
                      {/* Route */}
                      <div className="flex items-center gap-2 -mx-4 px-4 py-2 bg-slate-50 dark:bg-slate-900/30">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <span className="truncate font-medium text-foreground">{request.source.city}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <span className="truncate font-medium text-foreground">{request.destination.city}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>

                      {/* Item Info */}
                      <div className="text-xs">
                        <div className="font-medium text-foreground truncate">
                          📦 {itemName}
                          {extraItemsCount > 0 && (
                            <span className="text-muted-foreground font-normal"> +{extraItemsCount}</span>
                          )}
                        </div>
                        <div className="text-muted-foreground truncate">{itemCategory}</div>
                      </div>

                      {/* Vehicle / Workers / Weight - Grid */}
                      <div className="grid grid-cols-3 gap-2 text-xs -mx-4 px-4 py-2 bg-slate-50 dark:bg-slate-900/30">
                        <div className="text-center">
                          <div className="text-muted-foreground text-[10px] mb-1">Vehicle</div>
                          <div className="font-medium text-foreground truncate text-[11px]">
                            {vehicleName}
                          </div>
                        </div>
                        <div className="text-center border-l border-r border-border/30">
                          <div className="text-muted-foreground text-[10px] mb-1">Workers</div>
                          <div className="font-medium text-foreground text-[11px]">
                            {workersCount > 0 ? workersCount : "—"}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground text-[10px] mb-1">Weight</div>
                          <div className="font-medium text-foreground text-[11px]">
                            {totalWeight.toFixed(1)}kg
                          </div>
                        </div>
                      </div>

                      {/* Delivery Type */}
                      <div className="flex items-center gap-2 text-xs">
                        {request.deliveryType === "Urgent" ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                              {deliveryLabel}
                            </Badge>
                          </>
                        ) : (
                          <>
                            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                            <Badge variant="outline">{deliveryLabel}</Badge>
                          </>
                        )}
                      </div>

                      {/* My Offer */}
                      {myOffer && (
                        <div
                          className={`text-xs px-3 py-2 rounded-md flex items-center justify-between ${
                            myOffer.status === "accepted"
                              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                              : myOffer.status === "rejected"
                                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                          }`}
                        >
                          <span className="font-medium">
                            {t.driver.yourOfferLabel}:{" "}
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

                      {/* Action */}
                      <div className="mt-auto pt-2">
                        <Link href={`/driver/requests/${request.id || request._id}`} className="block">
                          <Button
                            variant={myOffer ? "outline" : "default"}
                            size="sm"
                            className="w-full gap-2 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {myOffer ? t.driver.viewDetails : t.driver.viewMakeOffer}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="border border-border rounded-lg p-4 bg-white dark:bg-slate-950/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t.driver.itemsPerPage}
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
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
                  <span className="font-medium">{filteredRequests.length}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages || 1, prev + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </section>
  );
}
