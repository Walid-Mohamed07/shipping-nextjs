"use client";

import { useEffect, useState } from "react";
import { Header } from "@/app/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { MapPin, Package, Check, X, DollarSign, Loader2 } from "lucide-react";

interface Item {
  item: string;
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
  coordinates: { latitude: number; longitude: number };
}

interface CostOffer {
  cost: number;
  comment: string;
  providerId: string;
}

interface Request {
  id: string;
  userId: string;
  user: { id: string; fullName: string; email: string };
  source: Location;
  destination: Location;
  items: Item[];
  requestStatus: string;
  deliveryStatus: string;
  costOffers: CostOffer[];
  createdAt: string;
  updatedAt: string;
}

export default function ProviderRequestsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [costOfferData, setCostOfferData] = useState<{
    [key: string]: { cost: string; comment: string };
  }>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "provider") {
      router.push("/");
      return;
    }

    fetchRequests();
  }, [user, router]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/requests/manage?status=Pending");
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      const response = await fetch("/api/requests/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action: "provider-accept",
          providerId: user?.id,
          providerName: user?.fullName || user?.name,
        }),
      });

      if (response.ok) {
        alert("Request accepted! Please set cost offer.");
        setExpandedRequest(requestId);
        await fetchRequests();
      }
    } catch (error) {
      console.error("Failed to accept request:", error);
      alert("Failed to accept request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm("Are you sure you want to reject this request?")) return;

    try {
      setProcessingId(requestId);
      const response = await fetch("/api/requests/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action: "provider-reject",
          providerId: user?.id,
        }),
      });

      if (response.ok) {
        alert("Request rejected");
        await fetchRequests();
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      alert("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSubmitCostOffer = async (requestId: string) => {
    const data = costOfferData[requestId];
    if (!data || !data.cost) {
      alert("Please enter a cost");
      return;
    }

    try {
      setProcessingId(requestId);
      const response = await fetch("/api/requests/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action: "provider-submit-offer",
          providerId: user?.id,
          providerName: user?.fullName || user?.name,
          costOffer: {
            cost: parseFloat(data.cost),
            comment: data.comment || "",
            providerId: user?.id,
          },
        }),
      });

      if (response.ok) {
        alert("Cost offer submitted successfully!");
        setCostOfferData({
          ...costOfferData,
          [requestId]: { cost: "", comment: "" },
        });
        setExpandedRequest(null);
        await fetchRequests();
      }
    } catch (error) {
      console.error("Failed to submit cost offer:", error);
      alert("Failed to submit cost offer");
    } finally {
      setProcessingId(null);
    }
  };

  if (!user || user.role !== "provider") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <p className="text-muted-foreground">
            Access denied. This page is for providers only.
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
            Assignment Requests
          </h1>
          <p className="text-muted-foreground">
            Review and respond to requests assigned by operators
          </p>
        </div>

        {requests.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No pending requests available
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const requestOffers = request.costOffers || [];
              const providerOffer = requestOffers.find(
                (o) => o.providerId === user?.id,
              );
              const hasAccepted =
                request.costOffers &&
                request.costOffers.some((o) => o.providerId === user?.id);

              return (
                <Card key={request.id} className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">
                        Request {request.id}
                      </h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            From
                          </p>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-medium">
                                {request.source.city}, {request.source.country}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {request.source.street}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            To
                          </p>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-medium">
                                {request.destination.city},{" "}
                                {request.destination.country}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {request.destination.street}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-2">
                          Items
                        </p>
                        <div className="space-y-1">
                          {request.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span>
                                {item.quantity}x {item.item} ({item.category}) -{" "}
                                {item.weight}kg
                              </span>
                              {item.note && (
                                <span className="text-muted-foreground italic">
                                  - {item.note}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>
                          Requested by:{" "}
                          <span className="font-medium text-foreground">
                            {request.user.fullName}
                          </span>{" "}
                          ({request.user.email})
                        </p>
                        <p>
                          Created:{" "}
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {!hasAccepted && (
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleAccept(request.id)}
                          disabled={processingId === request.id}
                          className="gap-2"
                        >
                          <Check className="w-4 h-4" />
                          {processingId === request.id
                            ? "Processing..."
                            : "Accept"}
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          variant="destructive"
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>

                  {hasAccepted && (
                    <div className="border-t border-border pt-4">
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                        <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                          ✓ You have accepted this request
                        </p>
                      </div>

                      {!providerOffer && (
                        <div className="space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Set Your Cost Offer
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <input
                              type="number"
                              placeholder="Cost amount"
                              value={costOfferData[request.id]?.cost || ""}
                              onChange={(e) =>
                                setCostOfferData({
                                  ...costOfferData,
                                  [request.id]: {
                                    ...costOfferData[request.id],
                                    cost: e.target.value,
                                  },
                                })
                              }
                              className="px-3 py-2 border border-border rounded-md bg-background"
                              min="0"
                              step="0.01"
                            />
                            <textarea
                              placeholder="Additional comments (optional)"
                              value={costOfferData[request.id]?.comment || ""}
                              onChange={(e) =>
                                setCostOfferData({
                                  ...costOfferData,
                                  [request.id]: {
                                    ...costOfferData[request.id],
                                    comment: e.target.value,
                                  },
                                })
                              }
                              className="px-3 py-2 border border-border rounded-md bg-background resize-none"
                              rows={2}
                            />
                          </div>
                          <Button
                            onClick={() => handleSubmitCostOffer(request.id)}
                            disabled={processingId === request.id}
                            className="gap-2"
                          >
                            <DollarSign className="w-4 h-4" />
                            {processingId === request.id
                              ? "Submitting..."
                              : "Submit Cost Offer"}
                          </Button>
                        </div>
                      )}

                      {providerOffer && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                            Your Cost Offer
                          </p>
                          <p className="text-2xl font-bold text-foreground mb-2">
                            ${providerOffer.cost.toFixed(2)}
                          </p>
                          {providerOffer.comment && (
                            <p className="text-sm text-muted-foreground">
                              {providerOffer.comment}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
