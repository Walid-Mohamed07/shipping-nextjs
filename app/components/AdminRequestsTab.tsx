"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check,
  X,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X as XIcon,
  RefreshCw,
} from "lucide-react";
import { RequestResponse } from "@/types/request";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import Image from "next/image";
import { useToast, getErrorMessage } from "@/lib/useToast";
import { useTranslation } from "@/app/context/LocaleContext";
import { useCategoryLabel } from "@/app/hooks/useCategoryLabel";
import { PriceDisplay } from "@/app/components/PriceDisplay";

const STATUS_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Pending: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-300",
  },
  Accepted: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-300",
  },
  Rejected: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-300",
  },
  "Action needed": {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  "In Progress": {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-300",
  },
  Completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-300",
  },
};

export function AdminRequestsTab() {
  const { user } = useAuth();
  const toastUtils = useToast();
  const { t } = useTranslation();
  const { getCategoryLabel } = useCategoryLabel();

  const translateStatus = (status: string): string => {
    const statuses = t.userRequestDetail.requestStatuses as Record<
      string,
      string
    >;
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

  // Regular data fetching (not live)
  const [requests, setRequests] = useState<RequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] =
    useState<RequestResponse | null>(null);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Fetch requests data
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/requests/manage");
      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }
      const data = await response.json();
      const requestsData = Array.isArray(data) ? data : data.requests || [];
      setRequests(requestsData);
    } catch (err) {
      toast.error(t.adminRequests.failedLoad);
      console.error("Failed to fetch requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle ESC key to close image zoom modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showImageZoom) {
        setShowImageZoom(false);
        setSelectedImageUrl(null);
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [showImageZoom]);

  const filteredRequests = statusFilter
    ? requests.filter((r) => r.requestStatus === statusFilter)
    : [...requests].sort((a, b) => {
        if (a.requestStatus === "Pending" && b.requestStatus !== "Pending")
          return -1;
        if (a.requestStatus !== "Pending" && b.requestStatus === "Pending")
          return 1;
        return 0;
      });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const statuses = Array.from(
    new Set(requests.map((r) => r.requestStatus)),
  ) as string[];

  const getStatusColors = (status: string) => {
    return STATUS_COLORS[status] || STATUS_COLORS.Pending;
  };

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await fetch("/api/requests/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          requestStatus: "Accepted",
          changedBy: user?.id || user?._id,
          role: user?.role,
          note: `Request accepted by ${user?.role}`,
        }),
      });

      if (response.ok) {
        // Real-time updates will handle refresh automatically
        // But trigger manual refresh for immediate feedback
        await refresh();
        setSelectedRequest(null);
        toastUtils.update(t.adminRequests.acceptedSuccess);
      } else {
        toastUtils.error(t.adminRequests.failedAccept);
      }
    } catch (error) {
      console.error("Failed to accept request:", error);
      toastUtils.error(getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await fetch("/api/requests/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          requestStatus: "Rejected",
          changedBy: user?.id || user?._id,
          role: user?.role,
          note: `Request rejected by ${user?.role}`,
        }),
      });

      if (response.ok) {
        // Real-time updates will handle refresh automatically
        await refresh();
        setSelectedRequest(null);
        toastUtils.delete(t.adminRequests.rejectedSuccess);
      } else {
        toastUtils.error(t.adminRequests.failedReject);
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      toastUtils.error(getErrorMessage(error));
    } finally {
      setProcessingId(null);
    }
  };

  const getProfileImage = (profilePicture?: string) => {
    if (profilePicture) return profilePicture;
    return "/assets/images/users/unknown.webp";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          {t.adminRequests.noRequests}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">
          {t.adminRequests.title}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {t.adminRequests.refresh}
        </Button>
      </div>

      {/* Filtering */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === null ? "default" : "outline"}
          onClick={() => setStatusFilter(null)}
          className="gap-2"
        >
          {t.adminRequests.allCount} ({requests.length})
        </Button>
        {statuses.map((status) => {
          const count = requests.filter(
            (r) => r.requestStatus === status,
          ).length;
          return (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              className="gap-2"
            >
              {translateStatus(status)} ({count})
            </Button>
          );
        })}
      </div>

      {/* Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {paginatedRequests.map((request) => {
          const isPending = request.requestStatus === "Pending";
          const colors = getStatusColors(request.requestStatus);

          return (
            <Card
              key={request._id}
              className="p-6 border border-border hover:border-primary/50 transition-colors"
            >
              {/* Client Info Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="shrink-0">
                  <img
                    src={
                      request.user
                        ? getProfileImage(
                            request.user.profilePicture ?? undefined,
                          ) || "/placeholder.svg"
                        : "/placeholder.svg"
                    }
                    alt={request.user?.fullName || "Unknown User"}
                    className="w-12 h-12 rounded-full bg-muted object-cover border border-border"
                    onError={(e) => {
                      e.currentTarget.src = "/assets/images/users/unknown.webp";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {request.user?.fullName || "Unknown User"}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {request.user?.email || "No email"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.adminRequests.requestId}{" "}
                    {request.publicId || request._id}
                  </p>
                </div>
              </div>

              {/* Request Details */}
              <div className="space-y-3 mb-4 pb-4 border-b border-border">
                {/* Status Badge */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t.adminRequests.status}
                  </p>
                  <div
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {translateStatus(request.requestStatus)}
                  </div>
                </div>

                {/* Route */}
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.adminRequests.route}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {request.source.country} → {request.destination.country}
                  </p>
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.adminRequests.items}
                  </p>
                  <div className="space-y-1">
                    {request.items.map((item, idx) => (
                      <div key={idx} className="text-sm text-foreground">
                        <p>
                          {item.quantity}x {item.item} ({getCategoryLabel(item.category)})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.adminRequests.weight} {item.weight}kg
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="text-xs text-muted-foreground">
                  <p>
                    {t.adminRequests.created}{" "}
                    {new Date(request.createdAt!).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setSelectedRequest(request)}
                  variant="outline"
                  className="flex-1 gap-2 bg-transparent"
                  disabled={processingId === request._id}
                >
                  <Eye className="w-4 h-4" />
                  {t.adminRequests.details}
                </Button>
                {isPending ? (
                  <>
                    <Button
                      onClick={() => handleAccept(request._id)}
                      disabled={processingId === request._id}
                      className="flex-1 gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {t.adminRequests.accept}
                    </Button>
                    <Button
                      onClick={() => handleReject(request._id)}
                      variant="destructive"
                      disabled={processingId === request._id}
                      className="flex-1 gap-2"
                    >
                      <X className="w-4 h-4" />
                      {t.adminRequests.reject}
                    </Button>
                  </>
                ) : (
                  <div className="flex-1 text-center">
                    <span className="text-sm text-muted-foreground">
                      {t.adminRequests.noActions}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t.common.previous}
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                onClick={() => setCurrentPage(page)}
                className="w-10 h-10"
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="gap-2"
          >
            {t.common.next}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setSelectedRequest(null)}
              className="absolute top-4 end-4 p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Modal Header */}
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {t.adminRequests.requestDetails}
            </h2>

            {/* Client Info */}
            <div className="mb-6 pb-6 border-b border-border">
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <img
                    src={
                      selectedRequest.user
                        ? getProfileImage(
                            selectedRequest.user.profilePicture ?? undefined,
                          ) || "/placeholder.svg"
                        : "/placeholder.svg"
                    }
                    alt={selectedRequest.user?.fullName || "Unknown User"}
                    className="w-16 h-16 rounded-full bg-muted object-cover border border-border"
                    onError={(e) => {
                      e.currentTarget.src = "/assets/images/users/unknown.webp";
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground">
                    {selectedRequest.user?.fullName || "Unknown User"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.user?.email || "No email"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t.adminRequests.phone}{" "}
                    {selectedRequest.source?.mobile ||
                      selectedRequest.user?.mobile ||
                      "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Request Status & Delivery Status */}
            <div className="mb-6 pb-6 border-b border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t.adminRequests.requestStatus}
                  </p>
                  <div
                    className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getStatusColors(selectedRequest.requestStatus).bg} ${getStatusColors(selectedRequest.requestStatus).text} ${getStatusColors(selectedRequest.requestStatus).border}`}
                  >
                    {translateStatus(selectedRequest.requestStatus)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t.adminRequests.deliveryStatus}
                  </p>
                  <div
                    className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getStatusColors(selectedRequest.deliveryStatus).bg} ${getStatusColors(selectedRequest.deliveryStatus).text} ${getStatusColors(selectedRequest.deliveryStatus).border}`}
                  >
                    {translateStatus(selectedRequest.deliveryStatus)}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="mb-6 pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">
                {t.adminRequests.deliveryDetails}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t.adminRequests.type}
                  </p>
                  <p className="text-foreground font-medium">
                    {selectedRequest.deliveryType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Collection Days
                  </p>
                  {selectedRequest.collectionAvailableDays &&
                  selectedRequest.collectionAvailableDays.length > 0 ? (
                    selectedRequest.collectionAvailableDays.includes(
                      "All Week",
                    ) ? (
                      <span className="inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                        All Week
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedRequest.collectionAvailableDays.map(
                          (day: string) => (
                            <span
                              key={day}
                              className="inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                            >
                              {day.slice(0, 3)}
                            </span>
                          ),
                        )}
                      </div>
                    )
                  ) : (
                    <p className="text-foreground font-medium">N/A</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Delivery Days
                  </p>
                  {selectedRequest.deliveryAvailableDays &&
                  selectedRequest.deliveryAvailableDays.length > 0 ? (
                    selectedRequest.deliveryAvailableDays.includes(
                      "All Week",
                    ) ? (
                      <span className="inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        All Week
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {selectedRequest.deliveryAvailableDays.map(
                          (day: string) => (
                            <span
                              key={day}
                              className="inline-flex items-center text-[10px] font-medium rounded-full px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            >
                              {day.slice(0, 3)}
                            </span>
                          ),
                        )}
                      </div>
                    )
                  ) : (
                    <p className="text-foreground font-medium">N/A</p>
                  )}
                </div>
                {/* TEMPORARILY HIDDEN - primaryCost
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t.adminRequests.primaryCost}
                  </p>
                  <p className="text-foreground font-medium">
                    {selectedRequest.primaryCost
                      ? <PriceDisplay amount={Number(selectedRequest.primaryCost)} size="sm" />
                      : "N/A"}
                  </p>
                </div>
                */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t.adminRequests.actualCost}
                  </p>
                  <p className="text-foreground font-medium">
                    {selectedRequest.cost
                      ? <PriceDisplay amount={Number(selectedRequest.cost)} size="sm" />
                      : "Pending"}
                  </p>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className="mb-6 pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">
                {t.adminRequests.route}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {selectedRequest.source.country}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedRequest.source.city}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRequest.source.street}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {t.adminRequests.to}
                  </p>
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {selectedRequest.destination.country}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedRequest.destination.city}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedRequest.destination.street}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mb-6 pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">
                {t.adminRequests.items}
              </h3>
              <div className="space-y-3">
                {selectedRequest.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="flex gap-3">
                      <div className="content-center">
                        <Image
                          src={
                            item.media!.length > 0
                              ? item.media![0].url
                              : "/assets/images/items/ShipHub_logo.png"
                          }
                          alt={item.name || "Item Image"}
                          width={70}
                          height={70}
                          className="rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            if (item.media!.length > 0) {
                              setSelectedImageUrl(item.media![0].url);
                              setShowImageZoom(true);
                            }
                          }}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between gap-2 mb-2">
                          <span className="font-medium text-foreground">
                            {item.item}
                          </span>
                          <span className="text-sm text-muted-foreground content-center">
                            {t.adminRequests.qty} {item.quantity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {t.adminRequests.category} {getCategoryLabel(item.category)}
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          {t.adminRequests.weight} {item.weight} kg
                        </p>
                        {item.note && (
                          <p className="text-sm text-muted-foreground italic">
                            {t.adminRequests.note} {item.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="mb-6 pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-3">
                {t.adminRequests.timeline}
              </h3>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {t.adminRequests.created}{" "}
                  <span className="text-foreground font-medium">
                    {new Date(selectedRequest.createdAt!).toLocaleString()}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  {t.adminRequests.updated}{" "}
                  <span className="text-foreground font-medium">
                    {new Date(selectedRequest.updatedAt!).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>

            {/* Cost Offers */}
            {selectedRequest.costOffers && selectedRequest.costOffers.length > 0 && (() => {
              const avgCompanyOffer =
                selectedRequest.costOffers!.reduce(
                  (sum, o) => sum + Number(o.cost),
                  0,
                ) / selectedRequest.costOffers!.length;
              return (
                <div className="mb-6 pb-6 border-b border-border">
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {t.adminRequests.costOffers}
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold">
                        {selectedRequest.costOffers!.length}
                      </span>
                    </h3>
                  </div>

                  {/* Avg company offer summary */}
                  <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {t.adminRequests.avgCompanyOffer}
                    </span>
                    <span
                      className="text-base font-bold text-blue-700 dark:text-blue-300"
                      dir="ltr"
                    >
                      ${avgCompanyOffer.toFixed(2)}
                    </span>
                  </div>

                  {/* Scrollable offer cards */}
                  <div
                    className="space-y-3 overflow-y-auto pe-1"
                    style={{ maxHeight: "22rem" }}
                  >
                    {selectedRequest.costOffers!.map((offer, idx) => (
                      <div
                        key={idx}
                        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                      >
                        {/* Card header: index + name + status */}
                        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/60 px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {idx + 1}
                            </span>
                            <span className="truncate text-sm font-semibold text-foreground">
                              {offer.company.name ||
                                `${t.adminRequests.offerLabel} ${idx + 1}`}
                            </span>
                          </div>
                          <span
                            className={
                              "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium " +
                              (offer.status === "accepted"
                                ? "border-green-300 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : offer.status === "rejected"
                                  ? "border-red-300 bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
                                  : "border-yellow-300 bg-yellow-100 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300")
                            }
                          >
                            {translateOfferStatus(offer.status)}
                          </span>
                        </div>

                        {/* Price breakdown */}
                        <div className="space-y-2 px-4 py-3 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {t.adminRequests.cost}
                            </span>
                            <PriceDisplay
                              amount={Number(offer.cost)}
                              currency={(offer as any).currency}
                              size="sm"
                              className="font-semibold"
                            />
                          </div>

                          {offer.headoverPercentage != null &&
                            offer.headoverAmount != null && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {t.adminRequests.headoverAmount}{" "}
                                  <span dir="ltr" className="inline">
                                    ({offer.headoverPercentage}%)
                                  </span>
                                </span>
                                <span
                                  className="font-medium text-orange-600 dark:text-orange-400"
                                  dir="ltr"
                                >
                                  +${Number(offer.headoverAmount).toFixed(2)}
                                </span>
                              </div>
                            )}

                          {offer.finalPrice != null && (
                            <div className="flex items-center justify-between gap-4 border-t border-border pt-2">
                              <span className="font-semibold text-foreground">
                                {t.adminRequests.finalPrice}
                              </span>
                              <PriceDisplay
                                amount={Number(offer.finalPrice)}
                                currency={(offer as any).currency}
                                size="md"
                                className="text-base font-bold text-primary"
                              />
                            </div>
                          )}
                        </div>

                        {/* Comment + date footer */}
                        {(offer.comment || offer.createdAt) && (
                          <div className="flex flex-wrap items-start justify-between gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                            {offer.comment && (
                              <p className="flex-1 italic">{offer.comment}</p>
                            )}
                            {offer.createdAt && (
                              <time
                                className="ms-auto shrink-0 whitespace-nowrap"
                                dir="ltr"
                              >
                                {new Date(
                                  offer.createdAt,
                                ).toLocaleDateString()}
                              </time>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Activity Log */}
            {selectedRequest.activityHistory &&
              selectedRequest.activityHistory.length > 0 && (
                <div className="mb-6 pb-6 border-b border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <span className="text-primary">📋</span>
                    {t.adminRequests.activityLog}
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {selectedRequest.activityHistory
                      .slice()
                      .reverse()
                      .map((activity, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 text-sm border-l-2 border-primary pl-3 py-2"
                        >
                          <div className="shrink-0 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Action and timestamp */}
                            <div className="flex items-baseline justify-between gap-2 flex-wrap">
                              <p className="font-medium text-foreground">
                                {activity.action
                                  .split("_")
                                  .map(
                                    (word) =>
                                      word.charAt(0).toUpperCase() +
                                      word.slice(1),
                                  )
                                  .join(" ")}
                              </p>
                              <time className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(
                                  activity.timestamp,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </time>
                            </div>

                            {/* Description */}
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.description}
                              </p>
                            )}

                            {/* Note display - show if present in details */}
                            {activity.details?.note && (
                              <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                                  <span>📝</span>
                                  <span>{t.adminRequests.note}</span>
                                </p>
                                <p className="text-sm text-amber-900 dark:text-amber-200 mt-0.5">
                                  {activity.details.note}
                                </p>
                              </div>
                            )}

                            {/* Company info and cost */}
                            <div className="flex flex-wrap gap-3 mt-2">
                              {activity.companyName && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">
                                    {t.adminRequests.company}{" "}
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {activity.companyName}
                                  </span>
                                </div>
                              )}
                              {activity.cost !== undefined &&
                                activity.cost !== null && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">
                                      {t.adminRequests.cost}{" "}
                                    </span>
                                    <span className="text-primary font-semibold">
                                      ${Number(activity.cost).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              {activity.companyRate && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">
                                    {t.adminRequests.rate}{" "}
                                  </span>
                                  <span className="text-foreground">
                                    {activity.companyRate} ⭐
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Selected Company */}
            {selectedRequest.selectedCompany && (
              <div className="mb-6 pb-6 border-b border-border">
                <h3 className="font-semibold text-foreground mb-3">
                  {t.adminRequests.selectedCompany}
                </h3>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="font-medium text-foreground">
                    {selectedRequest.selectedCompany.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.adminRequests.rate}{" "}
                    {selectedRequest.selectedCompany.rate}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.adminRequests.cost} $
                    {selectedRequest.selectedCompany.cost}
                  </p>
                </div>
              </div>
            )}

            {/* Warehouse Assignments */}
            {(selectedRequest.sourceWarehouse ||
              selectedRequest.destinationWarehouse) && (
              <div className="mb-6 pb-6 border-b border-border">
                <h3 className="font-semibold text-foreground mb-3">
                  {t.adminRequests.warehouseAssignments}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedRequest.sourceWarehouse && (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border text-sm">
                      <p className="font-medium text-foreground mb-1">
                        {t.adminRequests.sourceWarehouse}
                      </p>
                      <p className="text-muted-foreground">
                        {selectedRequest.sourceWarehouse.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedRequest.sourceWarehouse.city},{" "}
                        {selectedRequest.sourceWarehouse.country}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedRequest.sourceWarehouse.address}
                      </p>
                      {selectedRequest.sourceWarehouse.assignedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.adminRequests.assigned}{" "}
                          {new Date(
                            selectedRequest.sourceWarehouse.assignedAt,
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedRequest.destinationWarehouse && (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border text-sm">
                      <p className="font-medium text-foreground mb-1">
                        {t.adminRequests.destinationWarehouse}
                      </p>
                      <p className="text-muted-foreground">
                        {selectedRequest.destinationWarehouse.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedRequest.destinationWarehouse.city},{" "}
                        {selectedRequest.destinationWarehouse.country}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedRequest.destinationWarehouse.address}
                      </p>
                      {selectedRequest.destinationWarehouse.assignedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.adminRequests.assigned}{" "}
                          {new Date(
                            selectedRequest.destinationWarehouse.assignedAt,
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pickup Modes */}
            {(selectedRequest.sourcePickupMode ||
              selectedRequest.destinationPickupMode) && (
              <div className="mb-6 pb-6 border-b border-border">
                <h3 className="font-semibold text-foreground mb-3">
                  {t.adminRequests.pickupModes}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedRequest.sourcePickupMode && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t.adminRequests.from}
                      </p>
                      <p className="font-medium text-foreground">
                        {selectedRequest.sourcePickupMode}
                      </p>
                    </div>
                  )}
                  {selectedRequest.destinationPickupMode && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {t.adminRequests.to}
                      </p>
                      <p className="font-medium text-foreground">
                        {selectedRequest.destinationPickupMode}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comment */}
            {selectedRequest.comment && (
              <div className="mb-6 pb-6 border-b border-border">
                <h3 className="font-semibold text-foreground mb-2">
                  {t.adminRequests.comment}
                </h3>
                <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-lg border border-border">
                  {selectedRequest.comment}
                </p>
              </div>
            )}

            {/* Rejected By Companies */}
            {selectedRequest.rejectedByCompanies &&
              selectedRequest.rejectedByCompanies.length > 0 && (
                <div className="mb-6 pb-6 border-b border-border">
                  <h3 className="font-semibold text-foreground mb-3">
                    Rejected By
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.rejectedByCompanies.map((companyId) => (
                      <span
                        key={companyId}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm border border-red-300 dark:border-red-800"
                      >
                        {companyId}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* Close Button */}
            <Button onClick={() => setSelectedRequest(null)} className="w-full">
              {t.adminRequests.close}
            </Button>
          </Card>
        </div>
      )}

      {/* Image Zoom Modal */}
      {showImageZoom && selectedImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => {
            setShowImageZoom(false);
            setSelectedImageUrl(null);
          }}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImageUrl}
              alt="Zoomed image"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => {
                setShowImageZoom(false);
                setSelectedImageUrl(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-lg bg-gray-900/50 hover:bg-gray-900 text-white transition-colors cursor-pointer"
              aria-label="Close zoomed image"
            >
              <X className="w-6 h-6" />
            </button>
            <p className="absolute bottom-4 left-4 right-4 text-center text-sm text-gray-300">
              {t.adminRequests.clickToClose}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
