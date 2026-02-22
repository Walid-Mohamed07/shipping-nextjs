"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { RequestResponse } from "@/types/request";
import { useAuth } from "../context/AuthContext";
import Image from "next/image";
import { useToast, getErrorMessage } from "@/lib/useToast";

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
  const toast = useToast();
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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch("/api/requests/manage");
        if (response.ok) {
          const data = await response.json();
          // API returns array directly, not wrapped in object
          setRequests(Array.isArray(data) ? data : data.requests || []);
          setCurrentPage(1);
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        toast.error(getErrorMessage(error));
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

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
        setRequests(requests.filter((r) => r._id !== requestId));
        toast.update("Request accepted successfully");
      } else {
        toast.error("Failed to accept request");
      }
    } catch (error) {
      console.error("Failed to accept request:", error);
      toast.error(getErrorMessage(error));
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
        setRequests(requests.filter((r) => r._id !== requestId));
        toast.delete("Request rejected successfully");
      } else {
        toast.error("Failed to reject request");
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      toast.error(getErrorMessage(error));
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
        <p className="text-muted-foreground text-lg">No requests available</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">All Requests</h2>

      {/* Filtering */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === null ? "default" : "outline"}
          onClick={() => setStatusFilter(null)}
          className="gap-2"
        >
          All ({requests.length})
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
              {status} ({count})
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
                    Request ID: {request._id}
                  </p>
                </div>
              </div>

              {/* Request Details */}
              <div className="space-y-3 mb-4 pb-4 border-b border-border">
                {/* Status Badge */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <div
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    {request.requestStatus}
                  </div>
                </div>

                {/* Route */}
                <div>
                  <p className="text-xs text-muted-foreground">Route</p>
                  <p className="text-sm font-medium text-foreground">
                    {request.source.country} → {request.destination.country}
                  </p>
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs text-muted-foreground">Items</p>
                  <div className="space-y-1">
                    {request.items.map((item, idx) => (
                      <div key={idx} className="text-sm text-foreground">
                        <p>
                          {item.quantity}x {item.item} ({item.category})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Weight: {item.weight}kg | Size: {item.dimensions}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="text-xs text-muted-foreground">
                  <p>
                    Created: {new Date(request.createdAt!).toLocaleDateString()}
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
                  Details
                </Button>
                {isPending ? (
                  <>
                    <Button
                      onClick={() => handleAccept(request._id)}
                      disabled={processingId === request._id}
                      className="flex-1 gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleReject(request._id)}
                      variant="destructive"
                      disabled={processingId === request._id}
                      className="flex-1 gap-2"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                  </>
                ) : (
                  <div className="flex-1 text-center">
                    <span className="text-sm text-muted-foreground">
                      No actions available
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
            Previous
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
            Next
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
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Modal Header */}
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Request Details
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
                    Phone: {selectedRequest.user?.mobile || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Request Status & Delivery Status */}
            <div className="mb-6 pb-6 border-b border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Request Status
                  </p>
                  <div
                    className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getStatusColors(selectedRequest.requestStatus).bg} ${getStatusColors(selectedRequest.requestStatus).text} ${getStatusColors(selectedRequest.requestStatus).border}`}
                  >
                    {selectedRequest.requestStatus}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Delivery Status
                  </p>
                  <div
                    className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getStatusColors(selectedRequest.deliveryStatus).bg} ${getStatusColors(selectedRequest.deliveryStatus).text} ${getStatusColors(selectedRequest.deliveryStatus).border}`}
                  >
                    {selectedRequest.deliveryStatus}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="mb-6 pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">
                Delivery Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Type</p>
                  <p className="text-foreground font-medium">
                    {selectedRequest.deliveryType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Start Time
                  </p>
                  <p className="text-foreground font-medium">
                    {selectedRequest.startTime
                      ? new Date(selectedRequest.startTime).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Primary Cost
                  </p>
                  <p className="text-foreground font-medium">
                    ${selectedRequest.primaryCost || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Actual Cost
                  </p>
                  <p className="text-foreground font-medium">
                    ${selectedRequest.cost || "Pending"}
                  </p>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className="mb-6 pb-6 border-b border-border">
              <h3 className="font-semibold text-foreground mb-4">Route</h3>
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
                  <p className="text-xs text-muted-foreground mb-1">To</p>
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
              <h3 className="font-semibold text-foreground mb-4">Items</h3>
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
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Category: {item.category}
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          Weight: {item.weight} kg
                        </p>
                        <p className="text-sm text-muted-foreground mb-1">
                          Dimensions: {item.dimensions}
                        </p>
                        {item.note && (
                          <p className="text-sm text-muted-foreground italic">
                            Note: {item.note}
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
              <h3 className="font-semibold text-foreground mb-3">Timeline</h3>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Created:{" "}
                  <span className="text-foreground font-medium">
                    {new Date(selectedRequest.createdAt!).toLocaleString()}
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Updated:{" "}
                  <span className="text-foreground font-medium">
                    {new Date(selectedRequest.updatedAt!).toLocaleString()}
                  </span>
                </p>
              </div>
            </div>

            {/* Cost Offers */}
            {selectedRequest.costOffers ? (
              selectedRequest.costOffers?.length > 0 ? (
                <div className="mb-6 pb-6 border-b border-border">
                  <h3 className="font-semibold text-foreground mb-3">
                    Cost Offers ({selectedRequest.costOffers.length})
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedRequest.costOffers.map((offer, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-muted/50 rounded-lg border border-border"
                      >
                        <p className="font-medium text-foreground">
                          {offer.company.name || `Offer ${idx + 1}`}
                        </p>
                        {offer.cost && (
                          <p className="text-foreground">Cost: ${offer.cost}</p>
                        )}
                        {offer.comment && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            {offer.comment}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Status:{" "}
                          <span className="font-medium">{offer.status}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            ) : null}

            {/* Activity History */}
            {selectedRequest.activityHistory &&
              selectedRequest.activityHistory.length > 0 && (
                <div className="mb-6 pb-6 border-b border-border">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    📋 Activity History
                  </h3>
                  <div className="space-y-3">
                    {selectedRequest.activityHistory
                      .slice()
                      .reverse()
                      .map((activity, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-muted/40 rounded-lg border border-border text-sm space-y-2"
                        >
                          {/* Action title with timestamp */}
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">
                              {activity.action
                                .split("_")
                                .map(
                                  (word) =>
                                    word.charAt(0).toUpperCase() +
                                    word.slice(1),
                                )
                                .join(" ")}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              📅{" "}
                              {new Date(activity.timestamp).toLocaleString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>

                          {/* Description */}
                          {activity.description && (
                            <p className="text-muted-foreground">
                              {activity.description}
                            </p>
                          )}

                          {/* Company and cost details in grid */}
                          {(activity.companyName ||
                            activity.companyRate ||
                            activity.cost !== undefined) && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {activity.companyName && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Company:{" "}
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {activity.companyName}
                                  </span>
                                </div>
                              )}
                              {activity.cost !== undefined &&
                                activity.cost !== null && (
                                  <div>
                                    <span className="text-muted-foreground">
                                      Cost:{" "}
                                    </span>
                                    <span className="text-primary font-semibold">
                                      ${Number(activity.cost).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              {activity.companyRate && (
                                <div>
                                  <span className="text-muted-foreground">
                                    Rate:{" "}
                                  </span>
                                  <span className="text-foreground">
                                    {activity.companyRate} ⭐
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Expandable details */}
                          {activity.details &&
                            Object.keys(activity.details).length > 0 && (
                              <details className="text-xs cursor-pointer mt-2 p-2 bg-background/50 rounded border border-border/50">
                                <summary className="font-medium hover:text-primary transition-colors">
                                  ⚙️ Additional Details
                                </summary>
                                <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap break-words bg-background p-2 rounded">
                                  {JSON.stringify(activity.details, null, 2)}
                                </pre>
                              </details>
                            )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Selected Company */}
            {selectedRequest.selectedCompany && (
              <div className="mb-6 pb-6 border-b border-border">
                <h3 className="font-semibold text-foreground mb-3">
                  Selected Company
                </h3>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="font-medium text-foreground">
                    {selectedRequest.selectedCompany.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Rate: {selectedRequest.selectedCompany.rate}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cost: ${selectedRequest.selectedCompany.cost}
                  </p>
                </div>
              </div>
            )}

            {/* Warehouse Assignments */}
            {(selectedRequest.sourceWarehouse ||
              selectedRequest.destinationWarehouse) && (
              <div className="mb-6 pb-6 border-b border-border">
                <h3 className="font-semibold text-foreground mb-3">
                  Warehouse Assignments
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedRequest.sourceWarehouse && (
                    <div className="p-3 bg-muted/50 rounded-lg border border-border text-sm">
                      <p className="font-medium text-foreground mb-1">
                        Source Warehouse
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
                          Assigned:{" "}
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
                        Destination Warehouse
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
                          Assigned:{" "}
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
                  Pickup Modes
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedRequest.sourcePickupMode && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">From</p>
                      <p className="font-medium text-foreground">
                        {selectedRequest.sourcePickupMode}
                      </p>
                    </div>
                  )}
                  {selectedRequest.destinationPickupMode && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">To</p>
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
                <h3 className="font-semibold text-foreground mb-2">Comment</h3>
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
              Close
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
              Click outside or press ESC to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
