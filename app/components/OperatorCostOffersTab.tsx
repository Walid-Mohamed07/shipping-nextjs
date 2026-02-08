"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Plus, Trash2 } from "lucide-react";

interface CostOffer {
  cost: number;
  company: {
    id: string;
    name: string;
    email: string;
  };
  comment: string;
  selected: boolean;
}

interface Request {
  id: string;
  user: { id: string; fullName: string; email: string; profilePicture: string };
  source: { country: string; city: string };
  destination: { country: string; city: string };
  items: Array<{ item: string; category: string }>;
  requestStatus: string;
  costOffers: CostOffer[];
}

export function OperatorCostOffersTab() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [newOffers, setNewOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reqRes, compRes] = await Promise.all([
          fetch("/api/requests/manage?status=Accepted"),
          fetch("/api/admin/companies"),
        ]);
        const requests = await reqRes.json();
        const companies = await compRes.json();
        setRequests(requests);
        setCompanies(companies);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddOffer = () => {
    setNewOffers([...newOffers, { cost: 0, company: null, comment: "" }]);
  };

  const handleRemoveOffer = (index: number) => {
    setNewOffers(newOffers.filter((_, i) => i !== index));
  };

  const handleSubmitOffers = async () => {
    if (!selectedRequest || newOffers.length === 0) return;

    try {
      const response = await fetch("/api/requests/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          costOffers: newOffers.map((offer) => ({
            cost: offer.cost,
            company: companies.find((c) => c.id === offer.companyId),
            comment: offer.comment,
          })),
          userId: "operator-001",
        }),
      });

      if (response.ok) {
        alert("Cost offers submitted successfully");
        setSelectedRequest(null);
        setNewOffers([]);
        // Refresh requests
        const newRequests = await fetch(
          "/api/requests/manage?status=Accepted",
        ).then((r) => r.json());
        setRequests(newRequests);
      }
    } catch (error) {
      console.error("Failed to submit offers:", error);
      alert("Failed to submit cost offers");
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Select accepted requests to set cost offers. Once submitted, the request
        status will change to "Action needed"
      </div>

      {selectedRequest ? (
        <Card className="p-6 border-primary/50 bg-primary/5">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{selectedRequest.id}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedRequest.user.fullName} - {selectedRequest.source.country}{" "}
              → {selectedRequest.destination.country}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {newOffers.map((offer, index) => (
              <Card key={index} className="p-4 border-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Company
                    </label>
                    <select
                      value={offer.companyId || ""}
                      onChange={(e) => {
                        const updated = [...newOffers];
                        updated[index].companyId = e.target.value;
                        setNewOffers(updated);
                      }}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                    >
                      <option value="">Select company...</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={offer.cost}
                      onChange={(e) => {
                        const updated = [...newOffers];
                        updated[index].cost = parseFloat(e.target.value);
                        setNewOffers(updated);
                      }}
                      className="w-full px-3 py-2 border border-border rounded bg-background text-foreground"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveOffer(index)}
                      className="w-full gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Comment
                  </label>
                  <input
                    type="text"
                    value={offer.comment}
                    onChange={(e) => {
                      const updated = [...newOffers];
                      updated[index].comment = e.target.value;
                      setNewOffers(updated);
                    }}
                    className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
                    placeholder="e.g., Express delivery available"
                  />
                </div>
              </Card>
            ))}
          </div>

          <div className="flex gap-2 mb-6">
            <Button
              onClick={handleAddOffer}
              variant="outline"
              className="gap-2 bg-transparent"
            >
              <Plus className="w-4 h-4" />
              Add Offer
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubmitOffers}
              disabled={
                newOffers.length === 0 ||
                newOffers.some((o) => !o.companyId || o.cost === 0)
              }
              className="flex-1"
            >
              Submit Cost Offers
            </Button>
            <Button
              onClick={() => setSelectedRequest(null)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No accepted requests available
            </div>
          ) : (
            requests.map((req) => (
              <Card
                key={req.id}
                className="p-4 hover:border-primary transition-colors cursor-pointer"
              >
                <div
                  onClick={() => {
                    setSelectedRequest(req);
                    setNewOffers([]);
                  }}
                  className="flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {req.user.profilePicture ? (
                        <img
                          src={req.user.profilePicture || "/placeholder.svg"}
                          alt={req.user.fullName}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {req.user.fullName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{req.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {req.user.fullName}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {req.source.country} → {req.destination.country}
                    </p>
                  </div>
                  {req.costOffers.length > 0 && (
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium">
                        {req.costOffers.length} offers
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.requestStatus}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
