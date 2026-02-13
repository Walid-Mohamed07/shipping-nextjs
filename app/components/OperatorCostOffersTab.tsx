"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { Request } from "@/types";

export function OperatorCostOffersTab() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [newOffers, setNewOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "user">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  useEffect(() => {
    let filtered = requests.filter(
      (req) =>
        searchQuery === "" ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.user &&
          req.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return (
          new Date(b.createdAt || "").getTime() -
          new Date(a.createdAt || "").getTime()
        );
      } else if (sortBy === "user") {
        return (a.user?.fullName || "").localeCompare(b.user?.fullName || "");
      }
      return 0;
    });

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [requests, searchQuery, sortBy]);

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

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <div className="space-y-6">
      {!selectedRequest && (
        <>
          <div className="text-sm text-muted-foreground">
            Select accepted requests to set cost offers. Once submitted, the
            request status will change to "Action needed"
          </div>

          {/* Search and Sort */}
          <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 md:col-span-2">
                <input
                  type="text"
                  placeholder="Search by request ID or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-2 py-2 border border-border rounded text-sm bg-background"
                >
                  <option value="date">Date (Newest)</option>
                  <option value="user">Customer (A-Z)</option>
                </select>
              </div>
            </div>
          </Card>
        </>
      )}

      {selectedRequest ? (
        <Card className="p-6 border-primary/50 bg-primary/5">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{selectedRequest.id}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedRequest.user!.fullName} -{" "}
              {selectedRequest.source.country} →{" "}
              {selectedRequest.destination.country}
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
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No accepted requests available
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedRequests.map((req) => (
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
                          <Image
                            src={
                              req.user!.profilePicture ||
                              "/assets/images/users/unknown.webp"
                            }
                            alt={req.user!.fullName}
                            className="w-10 h-10 rounded-full"
                            width={40}
                            height={40}
                          />
                          <div>
                            <p className="font-medium">{req.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {req.user!.fullName}
                            </p>
                          </div>
                        </div>
                        {/* <p className="text-sm text-muted-foreground"> */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="font-medium text-foreground mb-1">
                              From
                            </p>
                            <div className="text-sm">
                              <p className="font-medium text-muted-foreground">
                                {req.source.country}
                              </p>
                              <p className="text-muted-foreground">
                                {req.source.city}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {req.source.street}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-foreground mb-1">
                              To
                            </p>
                            <div className="text-sm">
                              <p className="font-medium text-muted-foreground">
                                {req.destination.country}
                              </p>
                              <p className="text-muted-foreground">
                                {req.destination.city}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {req.destination.street}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* </p> */}
                      </div>
                      {req.costOffers && req.costOffers.length > 0 && (
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
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={
                            currentPage === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={pageNum > totalPages}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
