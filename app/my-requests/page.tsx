"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import {
  Package,
  ArrowRight,
  Calendar,
  MapPin,
  Tag,
  Banknote,
} from "lucide-react";
import { Request, Address } from "@/types";

// Helper to format a location object for display
const formatLocation = (loc: Address) => {
  if (!loc) return "-";
  if (loc.landmark) return loc.landmark;
  if (loc.street && loc.city && loc.country) {
    return `${loc.street}, ${loc.city}, ${loc.country}`;
  }
  if (loc.street) return loc.street;
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  if (loc.city) return loc.city;
  if (loc.country) return loc.country;
  return "-";
};

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for user to be defined (not undefined)
    // if (typeof user === "undefined") return;
    // if (!user) {
    //   router.push("/login");
    //   return;
    // }
    if (!user || !user.id) {
      router.push("/login");
      return;
    }

    const fetchRequests = async () => {
      try {
        const response = await fetch(`/api/requests?userId=${user.id}`);
        if (!response.ok) throw new Error("Failed to fetch requests");
        const data = await response.json();
        setRequests(data.requests);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch requests",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, [user?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800";
      case "In Transit":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-800";
      case "Delivered":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-800";
      case "Cancelled":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-800";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-800";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              My Shipping Requests
            </h1>
            <p className="text-muted-foreground">
              Track all your shipments in one place
            </p>
          </div>
          <Link href="/new-request">
            <Button className="gap-2 cursor-pointer">
              <Package className="w-4 h-4" />
              New Request
            </Button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No Requests Yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Create your first shipping request to get started
            </p>
            <Link href="/new-request">
              <Button className="cursor-pointer">
                Create Your First Request
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => {
              // Get preview items (first 3)
              const previewItems = (request.items || []).slice(0, 3);
              const remaining = Math.max(0, (request.items || []).length - 3);
              return (
                <Link key={request.id} href={`/request/${request.id}`}>
                  <div className="h-full bg-card rounded-lg border border-border hover:border-primary transition-colors p-6 cursor-pointer hover:shadow-md">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {previewItems[0]?.name || "Multiple Items"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {request.id}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(request.deliveryStatus)}`}
                      >
                        {request.deliveryStatus}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div className="space-y-2 mb-4 bg-muted/50 rounded-lg p-3">
                      {previewItems.map((item, idx) => (
                        <div key={item.id || `item-${idx}`} className="text-sm text-foreground">
                          • {item.name} {item.quantity > 1 ? `(×${item.quantity})` : ""}
                        </div>
                      ))}
                      {remaining > 0 && (
                        <div className="text-sm text-muted-foreground italic">
                          +{remaining} more item{remaining !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {formatLocation(request.from ?? request.source)} → {formatLocation(request.to ?? request.destination)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>{request.deliveryType === "fast" ? "Fast" : "Normal"} Delivery</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Banknote className="w-4 h-4 flex-shrink-0" />
                        <span>{request.primaryCost ? `$${request.primaryCost}` : "-"}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ""}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
