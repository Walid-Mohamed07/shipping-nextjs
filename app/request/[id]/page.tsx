"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/app/components/Header";
import { LiveTrackingMap } from "@/app/components/LiveTrackingMap";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import {
  Package,
  MapPin,
  Tag,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Banknote,
} from "lucide-react";

interface Location {
  label?: string;
  address?: string;
  country?: string;
  city?: string;
  [key: string]: any;
}

interface ShippingRequest {
  id: string;
  userId: string;
  from: Location;
  to: Location;
  item: string;
  category: string;
  estimatedTime: string;
  estimatedCost: string;
  dimensions: string;
  weight: string;
  quantity: number;
  orderStatus: string;
  deliveryStatus: string;
  createdAt: string;
  updatedAt: string;
}
// Helper to format a location object for display
const formatLocation = (loc: Location) => {
  if (!loc) return "-";
  if (loc.label) return loc.label;
  if (loc.address && loc.city && loc.country) {
    return `${loc.address}, ${loc.city}, ${loc.country}`;
  }
  if (loc.address) return loc.address;
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  if (loc.city) return loc.city;
  if (loc.country) return loc.country;
  return "-";
};

const statusSteps = [
  { name: "Pending", icon: Clock },
  { name: "In Transit", icon: Package },
  { name: "Delivered", icon: CheckCircle2 },
];

export default function RequestDetailsPage() {
  const [request, setRequest] = useState<ShippingRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  useEffect(() => {
    if (!user || !user.id) {
      router.push("/login");
      return;
    }

    const fetchRequest = async () => {
      try {
        const response = await fetch(`/api/requests/${requestId}`);
        if (!response.ok) throw new Error("Request not found");
        const data = await response.json();

        if (data.request.userId !== user.id) {
          throw new Error("Unauthorized");
        }

        setRequest(data.request);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch request",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [user?.id, requestId]);

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
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  const getCurrentStatusIndex = (status: string) => {
    return statusSteps.findIndex((step) => step.name === status);
  };

  const getOrderStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400";
      case "Accepted":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Rejected":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded-lg animate-pulse" />
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-red-800 dark:text-red-400 mb-2">
                Error
              </h2>
              <p className="text-red-700 dark:text-red-400">
                {error || "Request not found"}
              </p>
              <Link href="/my-requests" className="mt-4 inline-block">
                <Button className="cursor-pointer" variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Requests
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/my-requests" className="inline-block mb-6">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Requests
          </Button>
        </Link>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-card rounded-lg border border-border p-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {request.item}
                </h1>
                <p className="text-muted-foreground text-lg">{request.id}</p>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${getOrderStatusBadgeColor(request.orderStatus)}`}
                >
                  Order: {request.orderStatus}
                </span>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(request.deliveryStatus)}`}
                >
                  {request.deliveryStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Live Tracking Map - Only show when In Transit */}
          {request.deliveryStatus === "In Transit" && (
            <LiveTrackingMap
              from={request.from!.country!}
              to={request.to!.country!}
              isInTransit={true}
            />
          )}

          {/* Status Timeline */}
          <div className="bg-card rounded-lg border border-border p-8">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Shipment Progress
            </h2>
            <div className="flex items-center justify-between">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const currentIndex = getCurrentStatusIndex(
                  request.deliveryStatus,
                );
                const isCompleted = index <= currentIndex;
                const isCurrent = index === currentIndex;

                return (
                  <div key={step.name} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                          isCompleted
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          isCurrent
                            ? "text-primary"
                            : isCompleted
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {step.name}
                      </span>
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`h-1 flex-1 mx-2 ${
                          isCompleted ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Route Details */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Route Details
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">From</p>
                  <p className="text-lg font-medium text-foreground">
                    {formatLocation(request.from)}
                  </p>
                </div>
                <div className="border-l-2 border-primary h-8" />
                <div>
                  <p className="text-sm text-muted-foreground">To</p>
                  <p className="text-lg font-medium text-foreground">
                    {formatLocation(request.to)}
                  </p>
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Package Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="text-base font-medium text-foreground">
                    {request.category}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Item</p>
                  <p className="text-base font-medium text-foreground">
                    {request.item}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dimensions</p>
                  <p className="text-base font-medium text-foreground">
                    {request.dimensions}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weight</p>
                  <p className="text-base font-medium text-foreground">
                    {request.weight}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="text-base font-medium text-foreground">
                    {request.quantity}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timing Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Requested Date
              </h3>
              <p className="text-sm text-muted-foreground">
                {new Date(request.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(request.createdAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Estimated Time
              </h3>
              <p className="text-base font-medium text-foreground">
                {request.estimatedTime}
              </p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-primary" />
                Estimated Cost
              </h3>
              <p className="text-base font-medium text-foreground">
                {request.estimatedCost}
              </p>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Last Updated
              </h3>
              <p className="text-sm text-muted-foreground">
                {new Date(request.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(request.updatedAt).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Link href="/my-requests" className="flex-1">
              <Button
                variant="outline"
                className="w-full bg-transparent cursor-pointer"
              >
                Back to Requests
              </Button>
            </Link>
            <Link href="/new-request" className="flex-1">
              <Button className="w-full cursor-pointer">
                Create New Request
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
