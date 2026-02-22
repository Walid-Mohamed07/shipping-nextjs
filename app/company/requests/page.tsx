"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Package,
  DollarSign,
  Loader2,
  X,
  Truck,
  User as UserIcon,
  Scale,
  Box,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Request } from "@/types";
import { useToast } from "@/lib/useToast";
import { RequestCardSkeleton } from "@/app/components/loaders";
import { AuthGuard } from "@/app/components/AuthGuard";

interface CompanyInfo {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  rate?: string;
}

export default function CompanyRequestsPage() {
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  const router = useRouter();
  const { create, error: showError } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [offerModal, setOfferModal] = useState<{
    isOpen: boolean;
    requestId: string | null;
  }>({ isOpen: false, requestId: null });
  const [offerData, setOfferData] = useState({ cost: "", comment: "" });
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDeliveryStatus, setFilterDeliveryStatus] =
    useState<string>("all");
  const [filterPickupMode, setFilterPickupMode] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const fetchCompanyInfo = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Fetch company info associated with the user
      const response = await fetch(`/api/company/profile?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error("Failed to fetch company info:", error);
    }
  }, [user?.id]);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      // Fetch only requests that are visible to this company
      const response = await fetch(
        `/api/company/requests?companyId=${user.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoading) {
      return; // Wait for auth to load
    }
    if (!user || user.role !== "company") {
      router.push("/");
      return;
    }

    fetchCompanyInfo();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, isLoading]);

  const handleAddOffer = async () => {
    console.log("OfferModal:", offerModal);
    console.log("Attempting to add offer:", offerData);
    if (!offerModal.requestId || !offerData.cost) {
      showError("Please enter a cost amount");
      return;
    }

    const cost = parseFloat(offerData.cost);
    if (isNaN(cost) || cost <= 0) {
      showError("Please enter a valid cost amount");
      return;
    }

    try {
      setProcessingId(offerModal.requestId);
      const response = await fetch("/api/company/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-offer",
          requestId: offerModal.requestId,
          companyId: user?.id,
          company: companyInfo || {
            id: user?.id,
            name: user?.fullName || user?.name,
            email: user?.email,
          },
          offer: {
            cost,
            comment: offerData.comment || "",
          },
        }),
      });

      if (response.ok) {
        create(
          "Offer submitted successfully! The client will review your offer.",
        );
        setOfferModal({ isOpen: false, requestId: null });
        setOfferData({ cost: "", comment: "" });
        await fetchRequests();
      } else {
        const errorData = await response.json();
        showError(errorData.error || "Failed to submit offer");
      }
    } catch (error) {
      console.error("Failed to submit offer:", error);
      showError("Failed to submit offer");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (
      !confirm(
        "Are you sure you want to reject this request? You won't be able to see it again.",
      )
    ) {
      return;
    }

    try {
      setProcessingId(requestId);
      const response = await fetch("/api/company/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject-request",
          requestId,
          companyId: user?.id,
        }),
      });

      if (response.ok) {
        create("Request rejected successfully");
        await fetchRequests();
      } else {
        const errorData = await response.json();
        showError(errorData.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      showError("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  const getPickupModeLabel = (mode?: string) => {
    if (mode === "Delegate") return "Pickup by Company";
    if (mode === "Self") return "Self Pickup";
    return mode || "Not specified";
  };

  const getPickupModeBadgeColor = (mode?: string) => {
    if (mode === "Delegate")
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
    if (mode === "Self")
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200";
  };

  const hasExistingOffer = (request: Request) => {
    const myOffers =
      request.costOffers?.filter((offer) => offer.company.id === user?.id) ||
      [];
    return myOffers.length > 0;
  };

  const getMyOffers = (request: Request) => {
    return (
      request.costOffers?.filter((offer) => offer.company.id === user?.id) || []
    );
  };

  const canAddMoreOffers = (request: Request) => {
    const myOffers = getMyOffers(request);
    return myOffers.length < 3;
  };

  const getMyOffer = (request: Request) => {
    return request.costOffers?.find((offer) => offer.company.id === user?.id);
  };

  // Filter and paginate requests
  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
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

  return (
    <AuthGuard requiredRole="company">
      <div className="min-h-screen bg-background">
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Available Requests
            </h1>
            <p className="text-muted-foreground">
              Browse and submit offers for shipping requests
            </p>
          </div>

          {/* Filter Section */}
          <Card className="p-4 mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Filters
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Search by ID or Customer
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
                    Request Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  >
                    <option value="all">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Action needed">Action Needed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Delivery Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Delivery Status
                  </label>
                  <select
                    value={filterDeliveryStatus}
                    onChange={(e) => {
                      setFilterDeliveryStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in-transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Pickup Mode Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Pickup Mode
                  </label>
                  <select
                    value={filterPickupMode}
                    onChange={(e) => {
                      setFilterPickupMode(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
                  >
                    <option value="all">All Modes</option>
                    <option value="Self">Self Pickup</option>
                    <option value="Delegate">Company Pickup</option>
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
                    Reset Filters
                  </Button>
                </div>
              </div>

              {/* Results Info */}
              <div className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium">{filteredRequests.length}</span>{" "}
                of <span className="font-medium">{requests.length}</span>{" "}
                requests
              </div>
            </div>
          </Card>

          {loading ? (
            <RequestCardSkeleton count={6} />
          ) : requests.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No available requests at this time
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later for new shipping requests
              </p>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No requests match your filters
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filter criteria
              </p>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {paginatedRequests.map((request) => {
                  return (
                    <Card
                      key={request.id || request._id}
                      className="p-0 flex flex-col overflow-hidden hover:shadow-lg transition-shadow h-full"
                    >
                      {/* Header */}
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 px-4 py-2 flex items-center justify-between border-b border-border">
                        <div className="flex flex-col items-start gap-2">
                          <h3 className="text-sm font-bold text-foreground">
                            #{request.id || request._id}
                          </h3>
                          <div className="flex items-center gap-1">
                            Request Status:{" "}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 font-medium">
                              {request.requestStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            Delivery Status:{" "}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 font-medium">
                              {request.deliveryStatus}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            Created:{" "}
                            {new Date(request.createdAt!).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground text-opacity-75">
                            Updated:{" "}
                            {new Date(request.updatedAt!).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 flex flex-col flex-1 space-y-3">
                        {/* Locations Section - Full Details */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-2 space-y-1">
                            <div className="flex items-center gap-2 pb-1 mb-1 border-b border-border/30">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30">
                                <MapPin className="w-2 h-2 text-green-600 dark:text-green-400" />
                              </div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase">
                                From
                              </p>
                            </div>
                            <p className="text-xs font-medium text-foreground">
                              {request.source.street &&
                                `${request.source.street}, `}
                              {request.source.city}
                            </p>
                            {request.source.governorate && (
                              <p className="text-xs text-muted-foreground">
                                {request.source.governorate}
                              </p>
                            )}
                            {request.source.district && (
                              <p className="text-xs text-muted-foreground">
                                District: {request.source.district}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {request.source.country}
                            </p>
                            <span className="inline-block text-xs px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 mt-1">
                              {request.sourcePickupMode === "Self"
                                ? "Self Pickup"
                                : "Company Pickup"}
                            </span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-2 space-y-1">
                            <div className="flex items-center gap-2 pb-1 mb-1 border-b border-border/30">
                              <div className="flex items-center justify-center w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/30">
                                <MapPin className="w-2 h-2 text-red-600 dark:text-red-400" />
                              </div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase">
                                To
                              </p>
                            </div>
                            <p className="text-xs font-medium text-foreground">
                              {request.destination.street &&
                                `${request.destination.street}, `}
                              {request.destination.city}
                            </p>
                            {request.destination.governorate && (
                              <p className="text-xs text-muted-foreground">
                                {request.destination.governorate}
                              </p>
                            )}
                            {request.destination.district && (
                              <p className="text-xs text-muted-foreground">
                                District: {request.destination.district}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {request.destination.country}
                            </p>
                            <span className="inline-block text-xs px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 mt-1">
                              {request.destinationPickupMode === "Self"
                                ? "Self Pickup"
                                : "Company Pickup"}
                            </span>
                          </div>
                        </div>

                        {/* Client & Items Summary Row */}
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-2 space-y-1 border border-border/30">
                          <div className="flex items-center gap-2 mb-3">
                            <UserIcon className="w-3 h-3 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Client
                            </p>
                          </div>
                          <div className="flex flex-row items-center gap-3 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <img
                                src={
                                  typeof request.user === "object" &&
                                  request.user?.profilePicture
                                    ? request.user.profilePicture
                                    : "/default-avatar.png"
                                }
                                alt="User Avatar"
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <p className="text-xs font-medium text-foreground">
                                {typeof request.user === "object" &&
                                request.user?.fullName
                                  ? request.user.fullName
                                  : "Unknown"}
                              </p>
                              {typeof request.user === "object" &&
                                request.user?.email && (
                                  <p className="text-xs text-muted-foreground">
                                    {request.user.email}
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* Items Details - Full List */}
                        {request.items.length > 0 && (
                          <div className="bg-slate-50/50 dark:bg-slate-900/20 rounded p-2 border border-border/30">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Items ({request.items.length})
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {request.items.reduce(
                                  (sum, item) => sum + item.quantity,
                                  0,
                                )}{" "}
                                units total
                              </p>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {request.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between gap-2 text-xs bg-white dark:bg-slate-900/40 p-1.5 rounded border border-border/20"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                      {item.quantity}x {item.item || item.name}
                                    </p>
                                    {item.category && (
                                      <p className="text-xs text-muted-foreground">
                                        Category: {item.category}
                                      </p>
                                    )}
                                    {item.note && (
                                      <p className="text-xs text-amber-600 dark:text-amber-400">
                                        Note: {item.note}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-medium whitespace-nowrap">
                                      {item.weight}kg
                                    </p>
                                    {item.dimensions && (
                                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                                        {item.dimensions}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cost Info & Offers */}
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-2 border border-border/30">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Pricing
                          </p>
                          {request.primaryCost ? (
                            <div className="bg-white dark:bg-slate-900/40 p-2 rounded mb-2">
                              <p className="text-xs text-muted-foreground">
                                Primary Cost
                              </p>
                              <p className="text-lg font-bold text-primary">
                                ${request.primaryCost}
                              </p>
                            </div>
                          ) : (
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded mb-2 border border-amber-200 dark:border-amber-800">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                No primary cost set - awaiting company offers
                              </p>
                            </div>
                          )}

                          {request.costOffers &&
                            request.costOffers.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  Company Offers ({request.costOffers.length}):
                                </p>
                                {request.costOffers.map((offer, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white dark:bg-slate-900/40 p-1.5 rounded border border-border/20 text-xs"
                                  >
                                    <div className="flex justify-between items-start mb-0.5">
                                      <span className="font-medium text-foreground">
                                        {offer.company.name}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                          offer.status === "accepted"
                                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                                            : offer.status === "rejected"
                                              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                                        }`}
                                      >
                                        {offer.status}
                                      </span>
                                    </div>
                                    <p className="text-sm font-bold text-primary">
                                      ${offer.cost.toFixed(2)}
                                    </p>
                                    {offer.comment && (
                                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                                        "{offer.comment}"
                                      </p>
                                    )}
                                    {offer.createdAt && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {new Date(
                                          offer.createdAt,
                                        ).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                          {!hasExistingOffer(request) ? (
                            <div className="flex gap-2">
                              <Button
                                onClick={() =>
                                  setOfferModal({
                                    isOpen: true,
                                    requestId: request.id || request._id,
                                  })
                                }
                                disabled={
                                  processingId === request.id ||
                                  processingId === request._id
                                }
                                size="sm"
                                className="flex-1 gap-1"
                              >
                                <DollarSign className="w-3 h-3" />
                                Offer (0/3)
                              </Button>
                              <Button
                                onClick={() =>
                                  handleRejectRequest(request.id || request._id)
                                }
                                disabled={processingId === request.id}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : null}

                          {hasExistingOffer(request) && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
                              <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-2">
                                Your Offer
                              </p>
                              <div className="space-y-2">
                                {getMyOffers(request).map((offer, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-white dark:bg-slate-900/40 rounded p-1.5 border border-blue-200 dark:border-blue-800"
                                  >
                                    <div className="flex justify-between items-start">
                                      <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                        ${offer.cost.toFixed(2)}
                                      </p>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                          offer.status === "accepted"
                                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                                            : offer.status === "rejected"
                                              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                                        }`}
                                      >
                                        {offer.status}
                                      </span>
                                    </div>
                                    {offer.comment && (
                                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 italic">
                                        "{offer.comment}"
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {canAddMoreOffers(request) && (
                                <Button
                                  onClick={() =>
                                    setOfferModal({
                                      isOpen: true,
                                      requestId: request.id || request._id,
                                    })
                                  }
                                  disabled={
                                    processingId === request.id ||
                                    processingId === request._id
                                  }
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-2 gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  Update the Offer
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
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
                      Items per page:
                    </label>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 text-xs border border-border rounded bg-background"
                    >
                      <option value={3}>3</option>
                      <option value={6}>6</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                    </select>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Page{" "}
                    <span className="font-medium">
                      {currentPage} of {totalPages === 0 ? 1 : totalPages}
                    </span>{" "}
                    • Total:{" "}
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

        {/* Offer Modal */}
        {offerModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Submit Cost Offer
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Cost Amount ($) *
                  </label>
                  <input
                    type="number"
                    placeholder="Enter your offer amount"
                    value={offerData.cost}
                    onChange={(e) =>
                      setOfferData({ ...offerData, cost: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    min="0"
                    step="0.01"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Comments (Optional)
                  </label>
                  <textarea
                    placeholder="Add any additional details about your offer..."
                    value={offerData.comment}
                    onChange={(e) =>
                      setOfferData({ ...offerData, comment: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={() => {
                    setOfferModal({ isOpen: false, requestId: null });
                    setOfferData({ cost: "", comment: "" });
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddOffer}
                  disabled={
                    processingId === offerModal.requestId || !offerData.cost
                  }
                  className="flex-1"
                >
                  {processingId === offerModal.requestId
                    ? "Submitting..."
                    : "Submit Offer"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
