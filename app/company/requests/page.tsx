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
  DollarSign,
  Loader2,
  X,
  Truck,
  User as UserIcon,
  Scale,
  Box,
} from "lucide-react";

interface Item {
  item: string;
  name?: string;
  category: string;
  dimensions: string;
  weight: string;
  quantity: number;
  note: string | null;
}

interface Location {
  country: string;
  city: string;
  street: string;
  district?: string;
  governorate?: string;
  pickupMode?: string;
  coordinates?: { latitude: number; longitude: number };
}

interface CostOffer {
  cost: number;
  comment?: string;
  company: {
    id: string;
    name: string;
    phoneNumber?: string;
    email?: string;
    address?: string;
    rate?: string;
  };
  selected: boolean;
  status: "pending" | "accepted" | "rejected";
  createdAt?: string;
}

interface Request {
  id: string;
  user: { id: string; fullName: string; email: string };
  source: Location;
  destination: Location;
  items: Item[];
  requestStatus: string;
  deliveryStatus: string;
  costOffers?: CostOffer[];
  createdAt: string;
  updatedAt: string;
  sourcePickupMode?: string;
  destinationPickupMode?: string;
  assignedCompanyId?: string;
  rejectedByCompanies?: string[];
  primaryCost?: string;
}

interface CompanyInfo {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  rate?: string;
}

export default function CompanyRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [offerModal, setOfferModal] = useState<{
    isOpen: boolean;
    requestId: string | null;
  }>({ isOpen: false, requestId: null });
  const [offerData, setOfferData] = useState({ cost: "", comment: "" });
  const [processingId, setProcessingId] = useState<string | null>(null);

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
    if (!user || user.role !== "company") {
      router.push("/");
      return;
    }

    fetchCompanyInfo();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const handleAddOffer = async () => {
    if (!offerModal.requestId || !offerData.cost) {
      alert("Please enter a cost amount");
      return;
    }

    const cost = parseFloat(offerData.cost);
    if (isNaN(cost) || cost <= 0) {
      alert("Please enter a valid cost amount");
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
        alert(
          "Offer submitted successfully! The client will review your offer.",
        );
        setOfferModal({ isOpen: false, requestId: null });
        setOfferData({ cost: "", comment: "" });
        await fetchRequests();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to submit offer");
      }
    } catch (error) {
      console.error("Failed to submit offer:", error);
      alert("Failed to submit offer");
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
        alert("Request rejected");
        await fetchRequests();
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      alert("Failed to reject request");
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
    return request.costOffers?.some((offer) => offer.company.id === user?.id);
  };

  const getMyOffer = (request: Request) => {
    return request.costOffers?.find((offer) => offer.company.id === user?.id);
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
            Available Requests
          </h1>
          <p className="text-muted-foreground">
            Browse and submit offers for shipping requests
          </p>
        </div>

        {requests.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No available requests at this time
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later for new shipping requests
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {requests.map((request) => {
              const myOffer = getMyOffer(request);
              const hasOffer = hasExistingOffer(request);
              console.log("Request:", request);

              return (
                <Card
                  key={request.id}
                  className="p-0 flex flex-col overflow-hidden hover:shadow-lg transition-shadow h-full"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 px-4 py-2 flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">
                        #{request.id}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 font-medium">
                        {request.requestStatus}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="p-3 flex flex-col flex-1 space-y-3">
                    {/* Locations Section - Horizontal */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-start gap-2 pb-2 border-b border-border/50">
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30">
                            <MapPin className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            From
                          </p>
                          <p className="font-semibold text-xs mt-0.5">
                            {request.source.city}, {request.source.country}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200`}
                            >
                              {request.sourcePickupMode === "Self"
                                ? "Self"
                                : "Company"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pb-2 border-b border-border/50">
                        <div className="flex-shrink-0">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30">
                            <MapPin className="w-2.5 h-2.5 text-red-600 dark:text-red-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            To
                          </p>
                          <p className="font-semibold text-xs mt-0.5">
                            {request.destination.city},{" "}
                            {request.destination.country}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200`}
                            >
                              {request.destinationPickupMode === "Self"
                                ? "Self"
                                : "Company"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Items & Cost & Client Row */}
                    <div className="grid grid-cols-3 gap-2 pb-2 border-b border-border/50">
                      <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Items
                        </p>
                        <p className="text-base font-bold text-foreground mt-0.5">
                          {request.items.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.items.reduce(
                            (sum, item) => sum + item.quantity,
                            0,
                          )}{" "}
                          units
                        </p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Cost
                        </p>
                        {request.primaryCost ? (
                          <>
                            <p className="text-base font-bold text-primary mt-0.5">
                              ${request.primaryCost}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {request.costOffers &&
                              request.costOffers.length > 0
                                ? `${request.costOffers.length} offer(s)`
                                : "Primary"}
                            </p>
                          </>
                        ) : request.costOffers &&
                          request.costOffers.length > 0 ? (
                          <>
                            <p className="text-base font-bold text-primary mt-0.5">
                              $
                              {Math.min(
                                ...request.costOffers.map((o) => o.cost),
                              ).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {request.costOffers.length} offer(s)
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                              Pending
                            </p>
                            <p className="text-xs text-muted-foreground">
                              No offers
                            </p>
                          </>
                        )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900/30 rounded p-2 flex flex-col justify-center">
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground truncate">
                            {request.user?.fullName?.split(" ")[0] || "User"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Items Details - Compact */}
                    {request.items.length > 0 && (
                      <div className="bg-slate-50/50 dark:bg-slate-900/20 rounded p-2 border border-border/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Details
                        </p>
                        <div className="space-y-0.5">
                          {request.items.slice(0, 2).map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between gap-2 text-xs"
                            >
                              <span className="font-medium truncate">
                                {item.quantity}x {item.item || item.name}
                              </span>
                              <span className="text-muted-foreground whitespace-nowrap">
                                {item.weight}kg
                              </span>
                            </div>
                          ))}
                          {request.items.length > 2 && (
                            <p className="text-xs text-muted-foreground pt-0.5">
                              +{request.items.length - 2} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                      {!hasOffer ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              setOfferModal({
                                isOpen: true,
                                requestId: request.id,
                              })
                            }
                            disabled={processingId === request.id}
                            size="sm"
                            className="flex-1 gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            Offer
                          </Button>
                          <Button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={processingId === request.id}
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
                          <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wide mb-1">
                            Your Offer
                          </p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            ${myOffer?.cost.toFixed(2)}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            ⏳ Awaiting decision
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
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
  );
}
