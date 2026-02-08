"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, Eye, Loader2 } from "lucide-react";

interface ClientInfo {
  id: string;
  fullName: string;
  email: string;
  profilePicture?: string;
}

interface LocationData {
  country: string;
  city: string;
  street: string;
  coordinates?: { latitude: number; longitude: number };
}

interface ItemData {
  item: string;
  category: string;
  dimensions: string;
  weight: string;
  quantity: number;
  note?: string;
}

interface Request {
  id: string;
  userId: string;
  user: ClientInfo;
  source: LocationData;
  destination: LocationData;
  items: ItemData[];
  requestStatus:
    | "Pending"
    | "Accepted"
    | "Rejected"
    | "Action needed"
    | "In Progress"
    | "Completed";
  deliveryStatus: string;
  costOffers: any[];
  createdAt: string;
  updatedAt: string;
}

export function AdminRequestsTab() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await fetch("/api/requests/manage?status=Pending");
        if (response.ok) {
          const data = await response.json();
          // API returns array directly, not wrapped in object
          setRequests(Array.isArray(data) ? data : data.requests || []);
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const response = await fetch("/api/requests/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          requestStatus: "Accepted",
          changedBy: "admin-001",
          role: "admin",
          note: "Request accepted by admin",
        }),
      });

      if (response.ok) {
        setRequests(requests.filter((r) => r.id !== requestId));
      }
    } catch (error) {
      console.error("Failed to accept request:", error);
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
          changedBy: "admin-001",
          role: "admin",
          note: "Request rejected by admin",
        }),
      });

      if (response.ok) {
        setRequests(requests.filter((r) => r.id !== requestId));
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const getProfileImage = (profilePicture?: string) => {
    if (profilePicture) return profilePicture;
    return "https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous";
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
          No pending requests to review
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">
        Pending Requests
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {requests.map((request) => (
          <Card
            key={request.id}
            className="p-6 border border-border hover:border-primary/50 transition-colors"
          >
            {/* Client Info Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="shrink-0">
                <img
                  src={
                    getProfileImage(request.user.profilePicture) ||
                    "/placeholder.svg"
                  }
                  alt={request.user.fullName}
                  className="w-12 h-12 rounded-full bg-muted object-cover border border-border"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://api.dicebear.com/7.x/avataaars/svg?seed=anonymous";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {request.user.fullName}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {request.user.email}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Request ID: {request.id}
                </p>
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-3 mb-4 pb-4 border-b border-border">
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
                  Created: {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Link href={`/request/${request.id}`} className="flex-1">
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent"
                  disabled={processingId === request.id}
                >
                  <Eye className="w-4 h-4" />
                  Details
                </Button>
              </Link>
              <Button
                onClick={() => handleAccept(request.id)}
                disabled={processingId === request.id}
                className="flex-1 gap-2"
              >
                <Check className="w-4 h-4" />
                Accept
              </Button>
              <Button
                onClick={() => handleReject(request.id)}
                variant="destructive"
                disabled={processingId === request.id}
                className="flex-1 gap-2"
              >
                <X className="w-4 h-4" />
                Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
