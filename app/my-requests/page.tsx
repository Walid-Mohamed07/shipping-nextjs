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

interface ShippingRequest {
  id: string;
  userId: string;
  from: string;
  to: string;
  item: string;
  category: string;
  estimatedCost: string;
  estimatedTime: string;
  orderStatus: string;
  deliveryStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<ShippingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for user to be defined (not undefined)
    if (typeof user === "undefined") return;
    if (!user) {
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
  }, [user, router]);

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
            {requests.map((request) => (
              <Link key={request.id} href={`/request/${request.id}`}>
                <div className="h-full bg-card rounded-lg border border-border hover:border-primary transition-colors p-6 cursor-pointer hover:shadow-md">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground truncate">
                        {request.item}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {request.id}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(request.deliveryStatus)}`}
                    >
                      {request.deliveryStatus}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span>
                        {request.from} → {request.to}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="w-4 h-4 flex-shrink-0" />
                      <span>{request.category}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{request.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Banknote className="w-4 h-4 flex-shrink-0" />
                      <span>{request.estimatedCost}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
