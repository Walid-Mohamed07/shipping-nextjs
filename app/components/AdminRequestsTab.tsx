"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Check, X } from "lucide-react";
import { Request } from "@/types";
import { request } from "https";

interface AdminRequestsTabProps {
  onRequestAccepted: (requestId: string) => void;
}

export function AdminRequestsTab({ onRequestAccepted }: AdminRequestsTabProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch("/api/admin/requests");
        const data = await response.json();
        setRequests(data.requests || []);
      } catch (error) {
        console.error("Failed to fetch requests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleAccept = async (requestId: string) => {
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, requestStatus: "Accepted" }),
      });

      if (response.ok) {
        setRequests(
          requests.map((r) =>
            r.id === requestId ? { ...r, requestStatus: "Accepted" } : r,
          ),
        );
        onRequestAccepted(requestId);
      }
    } catch (error) {
      console.error("Failed to accept request:", error);
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: orderId, orderStatus: "Rejected" }),
      });

      if (response.ok) {
        setRequests(
          requests.map((o) =>
            o.id === orderId ? { ...o, orderStatus: "Rejected" } : o,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading requests...</div>;
  }

  const pendingOrders = requests.filter(
    (o) => (o.requestStatus ?? o.requestStatus) === "Pending",
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">
          Pending Orders ({pendingOrders.length})
        </h3>
      </div>

      {pendingOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No pending orders</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingOrders.map((request) => {
            const firstItem =
              request.items && request.items.length ? request.items[0] : null;
            const itemName = firstItem
              ? (firstItem.name ?? firstItem.name ?? "-")
              : "-";
            const category = firstItem ? firstItem.category : "-";
            const weight = firstItem ? firstItem.weight : null;
            const quantity = firstItem ? firstItem.quantity : null;

            return (
              <Card key={request.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-foreground">
                        {request.id}
                      </h4>
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                        Pending
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Client:{" "}
                      <span className="font-medium">
                        {request.user?.fullName ?? "-"}
                      </span>{" "}
                      ({request.user?.email ?? "-"})
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">From:</span>{" "}
                        <span className="font-medium">
                          {request.source?.city ?? "-"},{" "}
                          {request.source?.country ?? "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To:</span>{" "}
                        <span className="font-medium">
                          {request.destination?.city ?? "-"},{" "}
                          {request.destination?.country ?? "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Item:</span>{" "}
                        <span className="font-medium">{itemName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category:</span>{" "}
                        <span className="font-medium">{category}</span>
                      </div>
                      {weight && (
                        <div>
                          <span className="text-muted-foreground">Weight:</span>{" "}
                          <span className="font-medium">{weight} kg</span>
                        </div>
                      )}
                      {quantity != null && (
                        <div>
                          <span className="text-muted-foreground">
                            Quantity:
                          </span>{" "}
                          <span className="font-medium">{quantity}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(request.id!)}
                      className="gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(request.id!)}
                      className="gap-2 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">All Orders</h3>
        <div className="space-y-2">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium">{request.id}</p>
                <p className="text-sm text-muted-foreground">
                  {request.source?.city ?? "-"},{" "}
                  {request.source?.country ?? "-"} →{" "}
                  {request.destination?.city ?? "-"},{" "}
                  {request.destination?.country ?? "-"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    (request.requestStatus ?? request.requestStatus) ===
                    "Accepted"
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : (request.requestStatus ?? request.requestStatus) ===
                          "Rejected"
                        ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                  }`}
                >
                  {request.requestStatus ?? "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
