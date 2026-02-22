"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

interface CostOffer {
  cost: number;
  companyId: string;
  comment: string;
}

interface Company {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
  rate: string;
}

interface StatusHistory {
  status: string;
  changedAt: string;
  changedBy: string | null;
  role: string;
  note?: string | null;
}

interface RequestDetail {
  id: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    profilePicture?: string | null;
  };
  source: any;
  destination: any;
  items: any[];
  estimatedCost: string;
  requestStatus: string;
  deliveryStatus: string;
  deliveryType: string;
  comment: string;
  costOffers: CostOffer[];
  requestStatusHistory: StatusHistory[];
  deliveryStatusHistory: StatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOffer, setNewOffer] = useState({
    companyId: "",
    cost: "",
    comment: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState("");
  const [selectedRequestStatus, setSelectedRequestStatus] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch request details
        const [reqResponse, companiesResponse] = await Promise.all([
          fetch(`/api/admin/requests/${requestId}`),
          fetch("/api/admin/companies"),
        ]);

        if (reqResponse.ok) {
          const reqData = await reqResponse.json();
          setRequest(reqData.request);
          setSelectedRequestStatus(reqData.request.requestStatus);
          setSelectedDeliveryStatus(reqData.request.deliveryStatus);
        }

        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          setCompanies(companiesData.companies);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [requestId]);

  const handleAddCostOffer = async () => {
    if (!newOffer.companyId || !newOffer.cost) {
      alert("Please fill in company and cost");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          costOffers: [
            {
              cost: parseFloat(newOffer.cost),
              companyId: newOffer.companyId,
              comment: newOffer.comment,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRequest(data.request);
        setNewOffer({ companyId: "", cost: "", comment: "" });
      }
    } catch (error) {
      console.error("Failed to add cost offer:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (
    type: "request" | "delivery",
    status: string,
  ) => {
    const payload =
      type === "request"
        ? { requestStatus: status }
        : { deliveryStatus: status };

    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        setRequest(data.request);
        if (type === "request") {
          setSelectedRequestStatus(status);
        } else {
          setSelectedDeliveryStatus(status);
        }
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          Loading...
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          Request not found
        </div>
      </div>
    );
  }

  const firstItem = request.items?.[0];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            Request Details
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Client Info */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Client Information</h2>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Name:</span>{" "}
                  {request.user?.fullName}
                </p>
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  {request.user?.email}
                </p>
                <p>
                  <span className="font-medium">Request ID:</span> {request.id}
                </p>
              </div>
            </Card>

            {/* Route Information */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Route Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium text-sm mb-2">From</p>
                  <div className="text-sm space-y-1">
                    <p>{request.source?.fullName}</p>
                    <p>
                      {request.source?.street}, {request.source?.building}
                    </p>
                    <p>
                      {request.source?.city}, {request.source?.governorate}
                    </p>
                    <p>{request.source?.country}</p>
                  </div>
                </div>
                <div>
                  <p className="font-medium text-sm mb-2">To</p>
                  <div className="text-sm space-y-1">
                    <p>{request.destination?.fullName}</p>
                    <p>
                      {request.destination?.street},
                      {request.destination?.building}
                    </p>
                    <p>
                      {request.destination?.city},
                      {request.destination?.governorate}
                    </p>
                    <p>{request.destination?.country}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Item Details */}
            {firstItem && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Item Details</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <p>
                    <span className="font-medium">Item:</span> {firstItem.item}
                  </p>
                  <p>
                    <span className="font-medium">Category:</span>{" "}
                    {firstItem.category}
                  </p>
                  <p>
                    <span className="font-medium">Dimensions:</span>{" "}
                    {firstItem.dimensions}
                  </p>
                  <p>
                    <span className="font-medium">Weight:</span>{" "}
                    {firstItem.weight} kg
                  </p>
                  <p>
                    <span className="font-medium">Quantity:</span>{" "}
                    {firstItem.quantity}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    {request.deliveryType}
                  </p>
                </div>
              </Card>
            )}

            {/* Cost Offers */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Cost Offers</h2>

              {/* Add New Offer */}
              {request.requestStatus === "Pending" && (
                <div className="space-y-3 mb-6 p-4 bg-muted rounded">
                  <h3 className="font-medium">Add New Cost Offer</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Company
                      </label>
                      <select
                        value={newOffer.companyId}
                        onChange={(e) =>
                          setNewOffer({
                            ...newOffer,
                            companyId: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-input rounded-md"
                      >
                        <option value="">Select a company</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.rate}%)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Cost
                      </label>
                      <Input
                        type="number"
                        value={newOffer.cost}
                        onChange={(e) =>
                          setNewOffer({ ...newOffer, cost: e.target.value })
                        }
                        placeholder="Enter cost"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        Comment
                      </label>
                      <Input
                        value={newOffer.comment}
                        onChange={(e) =>
                          setNewOffer({ ...newOffer, comment: e.target.value })
                        }
                        placeholder="Optional comment"
                      />
                    </div>
                    <Button
                      onClick={handleAddCostOffer}
                      disabled={submitting}
                      className="w-full"
                    >
                      {submitting ? "Adding..." : "Add Cost Offer"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing Offers */}
              {request.costOffers && request.costOffers.length > 0 ? (
                <div className="space-y-2">
                  {request.costOffers.map((offer, idx) => {
                    const company = companies.find(
                      (c) => c.id === offer.companyId,
                    );
                    return (
                      <div
                        key={idx}
                        className="p-3 border border-border rounded bg-muted/50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{company?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {offer.comment}
                            </p>
                          </div>
                          <p className="font-semibold">${offer.cost}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No cost offers yet
                </p>
              )}
            </Card>

            {/* History */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Status History</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium mb-2">Request Status</h3>
                  <div className="space-y-1 text-sm">
                    {request.requestStatusHistory?.map((h, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        <span className="font-medium">{h.status}</span> -{" "}
                        {new Date(h.changedAt).toLocaleString()} by{" "}
                        {h.changedBy || "system"}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Delivery Status</h3>
                  <div className="space-y-1 text-sm">
                    {request.deliveryStatusHistory?.map((h, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        <span className="font-medium">{h.status}</span> -{" "}
                        {new Date(h.changedAt).toLocaleString()} by{" "}
                        {h.changedBy || "system"}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status Controls */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Actions</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Request Status
                  </label>
                  <select
                    value={selectedRequestStatus}
                    onChange={(e) =>
                      handleStatusChange("request", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Action needed">Action needed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Delivery Status
                  </label>
                  <select
                    value={selectedDeliveryStatus}
                    onChange={(e) =>
                      handleStatusChange("delivery", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Picked Up Source">Picked Up Source</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Failed">Failed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Summary Card */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {new Date(request.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estimated Cost</p>
                  <p className="font-medium">${request.estimatedCost}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
