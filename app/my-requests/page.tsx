"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { useLiveRequests, useLiveEvent } from "@/app/hooks/useLiveData";
import { toast } from "sonner";
import Link from "next/link";
import {
  Package,
  ArrowRight,
  Calendar,
  MapPin,
  Tag,
  Banknote,
  Wrench,
  BoxSelect,
  Warehouse,
  MapPinned,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Request, Address } from "@/types";
import { RequestCardSkeleton } from "@/app/components/loaders";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import dynamic from "next/dynamic";

// Dynamically import map components to avoid SSR issues
const LocationMapPicker = dynamic(
  () =>
    import("@/app/components/LocationMapPicker").then((mod) => ({
      default: mod.LocationMapPicker,
    })),
  { ssr: false },
);

// Helper to format a location object for display
const formatLocation = (loc: Address) => {
  if (!loc) return "-";

  const parts = [loc.country, loc.city].filter(Boolean);

  return parts.length ? parts.join(", ") : "-";
};

export default function MyRequestsPage() {
  const { user, isLoading: authLoading } = useProtectedRoute();
  
  // Use live data hook for real-time updates
  const { 
    data: requests, 
    isLoading, 
    error, 
    refresh,
    isConnected 
  } = useLiveRequests(user?.id);

  // Show toast notifications for real-time events
  useLiveEvent(
    ["OFFER_SUBMITTED", "OFFER_UPDATED", "STATUS_CHANGED", "DELIVERY_STATUS_CHANGED"],
    (event) => {
      if (event.type === "OFFER_SUBMITTED") {
        toast.info("New offer received!", {
          description: `${event.payload.companyName} submitted an offer`,
          action: {
            label: "View",
            onClick: () => window.location.href = `/request/${event.payload.requestId}`,
          },
        });
      } else if (event.type === "STATUS_CHANGED") {
        toast.info("Request status updated", {
          description: `Status changed to: ${event.payload.newStatus}`,
        });
      } else if (event.type === "DELIVERY_STATUS_CHANGED") {
        toast.success("Delivery update!", {
          description: event.payload.message || `Status: ${event.payload.newStatus}`,
        });
      }
    }
  );

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

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400";
      case "Accepted":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Rejected":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
      case "Action needed":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 font-semibold";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground">
                My Shipping Requests
              </h1>
              {/* Real-time connection indicator */}
              <div 
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  isConnected 
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" 
                    : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                }`}
                title={isConnected ? "Live updates active" : "Connecting..."}
              >
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? "Live" : "..."}
              </div>
            </div>
            <p className="text-muted-foreground">
              Track all your shipments in one place
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refresh()} className="gap-2 cursor-pointer">
              Refresh
            </Button>
            <Link href="/new-request">
              <Button className="gap-2 cursor-pointer">
                <Package className="w-4 h-4" />
                New Request
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {isLoading || authLoading ? (
          <RequestCardSkeleton count={3} />
        ) : !requests || requests.length === 0 ? (
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
                <Link key={request.id} href={`/request/${request.publicId}`}>
                  <div className="h-full bg-card rounded-lg border border-border hover:border-primary transition-colors p-6 cursor-pointer hover:shadow-md">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground truncate">
                          {request.publicId}
                        </h3>
                      </div>
                      <div className="ml-2">
                        {request.requestStatus && (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getRequestStatusColor(request.requestStatus)}`}
                          >
                            {request.requestStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="space-y-2 mb-4 bg-muted/50 rounded-lg p-3">
                      {previewItems.map((item, idx) => (
                        <div
                          key={item._id || `item-${idx}`}
                          className="text-sm text-foreground"
                        >
                          • {item.name || item.item}{" "}
                          {item.quantity > 1 ? `(×${item.quantity})` : ""}
                        </div>
                      ))}
                      {remaining > 0 && (
                        <div className="text-sm text-muted-foreground italic">
                          +{remaining} more item{remaining !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    {/* Services badges */}
                    {request.items &&
                      request.items.some(
                        (item) =>
                          item.services &&
                          (item.services.canBeAssembledDisassembled ||
                            item.services.assemblyDisassembly ||
                            item.services.packaging),
                      ) && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {request.items.some(
                            (item) =>
                              item.services?.canBeAssembledDisassembled ||
                              item.services?.assemblyDisassembly,
                          ) && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Wrench className="w-3 h-3" />
                              Assembly
                            </span>
                          )}
                          {request.items.some(
                            (item) => item.services?.packaging,
                          ) && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <BoxSelect className="w-3 h-3" />
                              Packaging
                            </span>
                          )}
                        </div>
                      )}

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {formatLocation(request.from ?? request.source)} →{" "}
                          {formatLocation(request.to ?? request.destination)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {request.deliveryType === "Urgent"
                            ? "Urgent"
                            : "Normal"}{" "}
                          Delivery
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {/* Always show primary/estimated cost */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Banknote className="w-4 h-4 flex-shrink-0" />
                          <span className={`font-medium ${request.selectedCompany ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {request.primaryCost && Number(request.primaryCost) > 0
                              ? `$${Number(request.primaryCost).toFixed(2)}`
                              : request.cost && Number(request.cost) > 0
                                ? `$${Number(request.cost).toFixed(2)}`
                                : "Not calculated"}
                          </span>
                          <span className="text-xs">(estimated)</span>
                        </div>
                        {/* Show accepted offer price when available */}
                        {request.selectedCompany && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="w-4 h-4 flex-shrink-0" />
                            <span className="font-semibold text-primary">
                              ${Number(request.selectedCompany.cost).toFixed(2)}
                            </span>
                            <span className="text-xs text-green-600 dark:text-green-400">(accepted offer)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {request.createdAt
                          ? new Date(request.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </div>

                    {/* Warehouse Locations */}
                    {(request.sourceWarehouse || request.destinationWarehouse) && (
                      <div
                        className="mt-4 pt-4 border-t border-border"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Accordion type="single" className="space-y-2">
                          {request.sourceWarehouse && (
                            <AccordionItem
                              value="source"
                              className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                            >
                              <AccordionTrigger
                                value="source"
                                className="bg-transparent px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Warehouse className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                  <span className="text-xs font-medium text-foreground">
                                    Source: {request.sourceWarehouse.name}
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent
                                value="source"
                                className="bg-white/50 dark:bg-gray-900/50 px-3 pb-3"
                              >
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    {request.sourceWarehouse.address}
                                    {request.sourceWarehouse.city &&
                                      `, ${request.sourceWarehouse.city}`}
                                    {request.sourceWarehouse.country &&
                                      `, ${request.sourceWarehouse.country}`}
                                  </p>
                                  {request.sourceWarehouse.coordinates && (
                                    <div className="h-48 w-full rounded-lg overflow-hidden border border-border">
                                      <LocationMapPicker
                                        position={{
                                          lat: request.sourceWarehouse
                                            .coordinates.latitude,
                                          lng: request.sourceWarehouse
                                            .coordinates.longitude,
                                        }}
                                        onPositionChange={() => {}}
                                        editable={false}
                                        showUseMyLocation={false}
                                      />
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                          {request.destinationWarehouse && (
                            <AccordionItem
                              value="destination"
                              className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                            >
                              <AccordionTrigger
                                value="destination"
                                className="bg-transparent px-3 py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPinned className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span className="text-xs font-medium text-foreground">
                                    Destination: {request.destinationWarehouse.name}
                                  </span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent
                                value="destination"
                                className="bg-white/50 dark:bg-gray-900/50 px-3 pb-3"
                              >
                                <div className="space-y-2">
                                  <p className="text-xs text-muted-foreground">
                                    {request.destinationWarehouse.address}
                                    {request.destinationWarehouse.city &&
                                      `, ${request.destinationWarehouse.city}`}
                                    {request.destinationWarehouse.country &&
                                      `, ${request.destinationWarehouse.country}`}
                                  </p>
                                  {request.destinationWarehouse.coordinates && (
                                    <div className="h-48 w-full rounded-lg overflow-hidden border border-border">
                                      <LocationMapPicker
                                        position={{
                                          lat: request.destinationWarehouse
                                            .coordinates.latitude,
                                          lng: request.destinationWarehouse
                                            .coordinates.longitude,
                                        }}
                                        onPositionChange={() => {}}
                                        editable={false}
                                        showUseMyLocation={false}
                                      />
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          )}
                        </Accordion>
                      </div>
                    )}
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
