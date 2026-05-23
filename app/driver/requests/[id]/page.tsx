"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/app/context/AuthContext";
import { useToast } from "@/lib/useToast";
import { AuthGuard } from "@/app/components/AuthGuard";
import { useLiveRequest, useLiveEvent } from "@/app/hooks/useLiveData";
import { toast } from "sonner";
import {
  MapPin,
  Package,
  DollarSign,
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
  Truck,
  Box,
  Phone,
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  Scale,
  Tag,
  MessageSquare,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Request, CostOffer } from "@/types";
import type { Address } from "@/types/address";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTranslation } from "@/app/context/LocaleContext";
import { useCategoryLabel } from "@/app/hooks/useCategoryLabel";
import { PriceDisplay } from "@/app/components/PriceDisplay";
import { useCurrency } from "@/app/context/CurrencyContext";

// Dynamically import route map component
const RequestRouteMap = dynamic(
  () =>
    import("@/app/components/RequestRouteMap").then((mod) => ({
      default: mod.RequestRouteMap,
    })),
  {
    ssr: false,
    loading: () => <div className="h-96 bg-muted animate-pulse rounded-lg" />,
  },
);

interface DriverInfo {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  rate?: number;
}

// Helper to format a location object for display
const formatLocation = (loc: Address) => {
  if (!loc) return "-";
  if (loc.street && loc.city && loc.country) {
    return `${loc.street}, ${loc.city}, ${loc.country}`;
  }
  if (loc.landmark) return loc.landmark;
  if (loc.street) return loc.street;
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  if (loc.city) return loc.city;
  if (loc.country) return loc.country;
  return "-";
};

export default function DriverRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { create, error: showError } = useToast();
  const { currency, convert } = useCurrency();

  const requestId = params.id as string;

  // Use live data hook for real-time request updates
  const {
    data: liveRequest,
    isLoading: requestLoading,
    error: requestError,
    refresh: refreshRequest,
    isConnected,
  } = useLiveRequest(requestId);

  const [request, setRequest] = useState<Request | null>(null);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Offer form state
  const [offerCost, setOfferCost] = useState("");
  const [offerComment, setOfferComment] = useState("");
  const [showOfferForm, setShowOfferForm] = useState(false);

  // UI state
  const [expandedItems, setExpandedItems] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { t, locale } = useTranslation();
  const { getCategoryLabel } = useCategoryLabel();

  const loading = authLoading || requestLoading;

  // Update local request state when live data changes
  useEffect(() => {
    if (liveRequest) {
      setRequest(liveRequest);
    }
  }, [liveRequest]);

  // Show toast notifications for real-time events on this request
  useLiveEvent(
    [
      "OFFER_SUBMITTED",
      "OFFER_ACCEPTED",
      "STATUS_CHANGED",
      "DELIVERY_STATUS_CHANGED",
    ],
    (event) => {
      if (event.requestId !== requestId) return;

      if (
        event.type === "OFFER_SUBMITTED" &&
        event.payload.driverId !== user?.id
      ) {
        toast.info(t.driverRequestDetail.toastOfferSubmitted.split(".")[0], {
          description: "The competition is on!",
        });
      } else if (event.type === "OFFER_ACCEPTED") {
        if (event.payload.driverId === user?.id) {
          toast.success(t.driver.offerAccepted, {
            description: "You can now manage this shipment",
          });
        } else {
          toast.info("Another offer was accepted", {
            description: "This request is no longer available",
          });
        }
      } else if (event.type === "STATUS_CHANGED") {
        toast.info("Request status updated", {
          description: `Status: ${event.payload.newStatus}`,
        });
      }
    },
    requestId,
  );

  const fetchDriverInfo = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/driver/profile?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setDriverInfo(data);
      } else {
        console.error("Failed to fetch driver profile");
      }
    } catch (error) {
      console.error("Failed to fetch driver info:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "driver") {
      router.push("/");
      return;
    }
    fetchDriverInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, authLoading]);

  const getMyOffers = (request: Request | null): CostOffer[] => {
    if (!request) return [];
    return (
      request.costOffers?.filter((offer) => offer.driver.id === user?.id) || []
    );
  };

  const handleSubmitOffer = async () => {
    if (!offerCost) {
      showError(t.driverRequestDetail.enterCost);
      return;
    }

    const cost = parseFloat(offerCost);
    if (isNaN(cost) || cost <= 0) {
      showError(t.driverRequestDetail.enterValidCost);
      return;
    }

    // Check if offer already submitted
    if (myOffers.length >= 1) {
      showError(t.driverRequestDetail.maxOffersReached);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/driver/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-offer",
          requestId,
          driverId: user?.id,
          driver: driverInfo || {
            id: user?.id,
            name: user?.fullName || user?.name,
            email: user?.email,
          },
          offer: {
            cost,
            currency,
            comment: offerComment || "",
            driverName: driverInfo?.name || user?.fullName || user?.name,
            driverRate: driverInfo?.rate || 0,
          },
        }),
      });

      if (response.ok) {
        create(t.driverRequestDetail.toastOfferSubmitted);
        setOfferCost("");
        setOfferComment("");
        setShowOfferForm(false);
        // Refresh will happen automatically via real-time updates
        // But also trigger manual refresh for immediate feedback
        await refreshRequest();
      } else {
        const errorData = await response.json();
        showError(errorData.error || t.driverRequestDetail.toastFailedSubmit);
      }
    } catch (error) {
      console.error("Failed to submit offer:", error);
      showError(t.driverRequestDetail.toastFailedSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!confirm(t.driverRequestDetail.confirmReject)) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/driver/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject-request",
          requestId,
          driverId: user?.id,
          driverName: driverInfo?.name || user?.fullName,
        }),
      });

      if (response.ok) {
        create("Request rejected successfully");
        router.push("/driver/requests");
      } else {
        const errorData = await response.json();
        showError(errorData.error || "Failed to reject request");
      }
    } catch (error) {
      console.error("Failed to reject request:", error);
      showError("Failed to reject request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOfferStatusLabel = (status: string): string => {
    switch (status) {
      case "accepted":
        return t.driver.offerStatusAccepted;
      case "rejected":
        return t.driver.offerStatusRejected;
      case "pending":
        return t.driver.offerStatusPending;
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getRequestStatusLabel = (status: string): string => {
    const statuses = t.userRequestDetail?.requestStatuses as
      | Record<string, string>
      | undefined;
    return statuses?.[status] ?? status;
  };

  const getDeliveryStatusLabel = (status: string): string => {
    const statuses = t.userRequestDetail?.deliveryStatuses as
      | Record<string, string>
      | undefined;
    return statuses?.[status] ?? status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200";
      case "Accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
      case "Action needed":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200";
      case "Assigned to Driver":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
      case "Completed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
      case "Cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200";
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    if (status === "Delivered")
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200";
    if (status === "In Transit")
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200";
    if (status === "Failed")
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200";
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requestError) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">{t.common.failedToLoad}</p>
        <p className="text-sm text-destructive">{requestError}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refreshRequest()}>
            {t.common.tryAgain}
          </Button>
          <Link href="/driver/requests">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.driverRequestDetail.backToRequests}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t.common.requestNotFound}</p>
        <Link href="/driver/requests">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.driverRequestDetail.backToRequests}
          </Button>
        </Link>
      </div>
    );
  }

  const myOffers = getMyOffers(request);
  const totalWeight = request.items.reduce(
    (sum, item) => sum + parseFloat(item.weight || "0") * item.quantity,
    0,
  );
  const totalQuantity = request.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return (
    <AuthGuard requiredRole="driver">
      <div className="min-h-screen bg-background">
        <main className="max-w-5xl mx-auto px-4 py-6 pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/driver/requests">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.common.back}
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">
                    {request.publicId}
                  </h1>
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      isConnected
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {isConnected ? (
                      <Wifi className="w-3 h-3" />
                    ) : (
                      <WifiOff className="w-3 h-3" />
                    )}
                    {isConnected ? t.common.live : "..."}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getStatusColor(request.requestStatus)}>
                    {getRequestStatusLabel(request.requestStatus)}
                  </Badge>
                  <Badge
                    className={getDeliveryStatusColor(request.deliveryStatus)}
                  >
                    {getDeliveryStatusLabel(request.deliveryStatus)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1 justify-end">
                <Calendar className="w-3 h-3" />
                {new Date(request.createdAt!).toLocaleDateString(locale)}
              </div>
            </div>
          </div>

          {/* ── 1. Full-width Route Map ── */}
          {(() => {
            const src = request.source;
            const dst = request.destination;
            if (
              src?.coordinates?.latitude &&
              src?.coordinates?.longitude &&
              dst?.coordinates?.latitude &&
              dst?.coordinates?.longitude
            ) {
              return (
                <RequestRouteMap
                  sourceCoords={src.coordinates}
                  destinationCoords={dst.coordinates}
                  sourceLabel={formatLocation(src)}
                  destinationLabel={formatLocation(dst)}
                  translations={{
                    routeMap: t.userRequestDetail.routeMap || "Route Map",
                    distance: t.userRequestDetail.distance || "Distance",
                    estimatedTime:
                      t.userRequestDetail.estimatedTime || "Est. Travel Time",
                    source: t.userRequestDetail.from || "From",
                    destination: t.userRequestDetail.to || "To",
                    loadingRoute:
                      t.userRequestDetail.loadingRoute || "Loading route...",
                    straightLineEstimate:
                      t.userRequestDetail.straightLineEstimate ||
                      "Straight-line estimate",
                    km: t.userRequestDetail.km || "km",
                  }}
                />
              );
            }
            // Fallback — compact address card when no coordinates
            return (
              <Card className="p-5 mb-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  {t.driverRequestDetail.shippingRoute}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block w-3 h-3 rounded-full bg-green-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t.userRequestDetail.from || "From"}
                      </p>
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {formatLocation(src)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-1 inline-block w-3 h-3 rounded-full bg-red-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t.userRequestDetail.to || "To"}
                      </p>
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {formatLocation(dst)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* ── 2. Compact Request Details Card ── */}
          <Card className="p-6 mt-6">
            {/* Pickup & Delivery Modes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                      {t.driverRequestDetail.pickupLocation}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300"
                    >
                      {request.sourcePickupMode === "Self"
                        ? t.driverRequestDetail.selfPickup
                        : t.driverRequestDetail.driverPickup}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">
                    {request.source.city}, {request.source.country}
                  </p>
                  {request.source.street && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {request.source.street}
                      {request.source.building &&
                        `, ${request.source.building}`}
                    </p>
                  )}
                  {request.source.mobile && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {request.source.mobile}
                    </p>
                  )}
                </div>
              </div>
              {/* Delivery */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      {t.driverRequestDetail.deliveryDestination}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {request.destinationPickupMode === "Self"
                        ? t.driverRequestDetail.selfDelivery
                        : t.driverRequestDetail.driverDelivery}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground">
                    {request.destination.city}, {request.destination.country}
                  </p>
                  {request.destination.street && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {request.destination.street}
                      {request.destination.building &&
                        `, ${request.destination.building}`}
                    </p>
                  )}
                  {request.destination.mobile && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {request.destination.mobile}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-border mb-5" />

            {/* Summary row: delivery type · vehicle · workers · weight · items */}
            <div className="flex flex-wrap gap-3 mb-5">
              {/* Delivery Type */}
              <Badge
                variant="secondary"
                className={`text-xs font-semibold ${
                  request.deliveryType === "Urgent"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    : request.deliveryType === "Scheduled"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : ""
                }`}
              >
                {request.deliveryType === "Urgent"
                  ? `⚡ ${t.newRequest.urgent}`
                  : request.deliveryType === "Scheduled"
                    ? `📅 ${t.driverRequestDetail.scheduledDelivery}`
                    : t.newRequest.normal}
              </Badge>
              {request.deliveryType === "Scheduled" &&
                request.scheduledDate && (
                  <Badge variant="outline" className="text-xs">
                    {new Date(request.scheduledDate).toLocaleString(locale, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Badge>
                )}
              {/* Vehicle */}
              {request.transportVehicle && (
                <Badge variant="secondary" className="text-xs">
                  <Truck className="w-3 h-3 mr-1" />
                  {request.transportVehicle.nameEn}
                </Badge>
              )}
              {/* Workers */}
              {request.workersCount != null && request.workersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  👷 {request.workersCount}{" "}
                  {request.workersCount === 1
                    ? t.driverRequestDetail.worker
                    : t.driverRequestDetail.workers}
                </Badge>
              )}
              {/* Total Weight & Qty */}
              <Badge variant="secondary" className="text-xs">
                <Box className="w-3 h-3 mr-1" />
                {totalQuantity} {t.driver.units}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Scale className="w-3 h-3 mr-1" />
                {totalWeight.toFixed(1)} kg
              </Badge>
            </div>

            {/* Shipment Items */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                {t.driverRequestDetail.shipmentItems}
              </h4>
              <div className="space-y-2">
                {request.items
                  .slice(0, expandedItems ? undefined : 3)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">
                            {item.quantity}x {item.item || item.name}
                          </span>
                          {item.category && (
                            <Badge variant="outline" className="text-[10px]">
                              <Tag className="w-2.5 h-2.5 mr-0.5" />
                              {getCategoryLabel(item.category)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Scale className="w-3 h-3 inline mr-1" />
                          {item.weight} kg
                        </p>
                        {item.note && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{item.note}</span>
                          </p>
                        )}
                      </div>
                      {/* Item Media */}
                      {item.media && item.media.length > 0 && (
                        <div className="flex gap-1.5 shrink-0">
                          {item.media.slice(0, 2).map((media, mediaIdx) => (
                            <button
                              key={mediaIdx}
                              onClick={() => {
                                setSelectedImage(media.url);
                                setShowImageModal(true);
                              }}
                              className="relative w-12 h-12 rounded-md overflow-hidden border border-border hover:border-primary transition-colors"
                            >
                              <img
                                src={media.url}
                                alt={`Item ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                          {item.media.length > 2 && (
                            <div className="w-12 h-12 rounded-md bg-muted border border-border flex items-center justify-center">
                              <span className="text-xs font-semibold text-muted-foreground">
                                +{item.media.length - 2}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
              {request.items.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedItems(!expandedItems)}
                  className="w-full mt-2"
                >
                  {expandedItems ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      {t.common.showLess}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      {t.driverRequestDetail.showAllItems} (
                      {request.items.length})
                    </>
                  )}
                </Button>
              )}
            </div>

            <hr className="border-border mb-5" />

            {/* Delivery Details Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Preferred Time */}
              {request.startTime && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Preferred Time
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {request.startTime}
                  </p>
                </div>
              )}
              {/* Collection Days */}
              {request.collectionAvailableDays &&
                request.collectionAvailableDays.length > 0 && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{" "}
                      {t.driverRequestDetail.collectionAvailableDays}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {request.collectionAvailableDays.includes("All Week") ? (
                        <Badge className="text-[10px] bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100 border-0">
                          {t.common.allWeek}
                        </Badge>
                      ) : (
                        request.collectionAvailableDays.map((day) => (
                          <Badge
                            key={`c-${day}`}
                            className="text-[10px] bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100 border-0"
                          >
                            {day}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                )}
              {/* Delivery Days */}
              {request.deliveryAvailableDays &&
                request.deliveryAvailableDays.length > 0 && (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{" "}
                      {t.driverRequestDetail.deliveryAvailableDays}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {request.deliveryAvailableDays.includes("All Week") ? (
                        <Badge className="text-[10px] bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 border-0">
                          {t.common.allWeek}
                        </Badge>
                      ) : (
                        request.deliveryAvailableDays.map((day) => (
                          <Badge
                            key={`d-${day}`}
                            className="text-[10px] bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 border-0"
                          >
                            {day}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                )}
              {/* Floor Numbers */}
              {request.receiptFloorNumber && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    🏢 {t.newRequest.receiptFloorNumber}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {request.receiptFloorNumber === "0"
                      ? t.newRequest.groundFloor
                      : request.receiptFloorNumber}
                  </p>
                  {request.needsWinchPickup && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                      🏗️ {t.newRequest.needsWinchPickup}
                    </p>
                  )}
                </div>
              )}
              {request.deliveryFloorNumber && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    🏢 {t.newRequest.deliveryFloorNumber}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {request.deliveryFloorNumber === "0"
                      ? t.newRequest.groundFloor
                      : request.deliveryFloorNumber}
                  </p>
                  {request.needsWinchDropoff && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                      🏗️ {t.newRequest.needsWinchDropoff}
                    </p>
                  )}
                </div>
              )}
              {/* Transport Vehicle details */}
              {request.transportVehicle && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <Truck className="w-3 h-3" />{" "}
                    {t.driverRequestDetail.transportVehicle}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {request.transportVehicle.nameAr}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {request.transportVehicle.dimensions.length}m ×{" "}
                    {request.transportVehicle.dimensions.width}m ×{" "}
                    {request.transportVehicle.dimensions.height}m · max{" "}
                    {request.transportVehicle.maxWeight} kg
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* ── 3. Client Comment ── */}
          {request.comment && (
            <Card className="p-5 mt-6">
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {t.driverRequestDetail.additionalNotes}
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {request.comment}
              </p>
            </Card>
          )}

          {/* ── 4. Offers Section ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            {/* My Offers */}
            {myOffers.length > 0 && (
              <Card className="p-5 border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-900/10">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {t.driverRequestDetail.yourActiveOffer}
                </h4>
                <div className="space-y-3">
                  {myOffers.map((offer, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-900/60 rounded-lg p-4 border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">
                            {t.driverRequestDetail.yourBid}
                          </p>
                          <PriceDisplay
                            amount={offer.cost}
                            currency={(offer as any).currency}
                            size="lg"
                            className="text-xl font-bold text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <Badge
                          className={
                            offer.status === "accepted"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border-green-300"
                              : offer.status === "rejected"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-300"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-300"
                          }
                        >
                          {offer.status === "accepted" && (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          )}
                          {offer.status === "rejected" && (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {getOfferStatusLabel(offer.status)}
                        </Badge>
                      </div>
                      {offer.comment && (
                        <p className="text-xs text-blue-900 dark:text-blue-100 italic mt-2 p-2 bg-blue-50/50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                          &ldquo;{offer.comment}&rdquo;
                        </p>
                      )}
                      {offer.createdAt && (
                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(offer.createdAt).toLocaleString(locale)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Competing Offers */}
            {request.costOffers &&
              request.costOffers.filter((o) => o.driver.id !== user?.id)
                .length > 0 && (
                <Card className="p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {t.driverRequestDetail.competingOffers} (
                    {
                      request.costOffers.filter(
                        (o) => o.driver.id !== user?.id,
                      ).length
                    }
                    )
                  </h4>
                  <div className="space-y-2">
                    {request.costOffers
                      .filter((o) => o.driver.id !== user?.id)
                      .map((offer, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 rounded-lg border border-border bg-muted/30"
                        >
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {offer.driver.name}
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {
                                convert(
                                  offer.cost,
                                  (offer as any).currency || "USD",
                                ).formatted
                              }
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              offer.status === "accepted"
                                ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30"
                                : "border-border"
                            }
                          >
                            {getOfferStatusLabel(offer.status)}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </Card>
              )}
          </div>
        </main>

        {/* ── 5. Sticky Bottom Action Bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
          <div className="max-w-2xl mx-auto px-4 pb-4 pointer-events-auto">
            <Card className="p-4 shadow-xl border-t-2 border-primary/20 bg-card/95 backdrop-blur-md">
              {myOffers.length >= 1 ? (
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium text-center">
                    {t.driverRequestDetail.maxOffersReached}
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowOfferForm(true)}
                    className="flex-1 gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    {t.driverRequestDetail.makeAnOffer}
                  </Button>
                  <Button
                    onClick={handleRejectRequest}
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                    disabled={isSubmitting}
                  >
                    <XCircle className="w-4 h-4" />
                    {t.driverRequestDetail.notInterested}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* ── Offer Form Modal ── */}
        {showOfferForm && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1500] p-4"
            onClick={() => {
              setShowOfferForm(false);
              setOfferCost("");
              setOfferComment("");
            }}
          >
            <Card
              className="w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  {t.driverRequestDetail.submitAnOffer}
                </h3>
                <button
                  onClick={() => {
                    setShowOfferForm(false);
                    setOfferCost("");
                    setOfferComment("");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Price */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t.driverRequestDetail.yourPrice}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      {currency}
                    </span>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={offerCost}
                      onChange={(e) => setOfferCost(e.target.value)}
                      className="w-full pl-14 pr-4 py-2.5 text-base font-semibold border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      min="0"
                      step="0.01"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    {t.driverRequestDetail.commentOptional}
                  </label>
                  <textarea
                    placeholder={t.driverRequestDetail.offerPlaceholder}
                    value={offerComment}
                    onChange={(e) => setOfferComment(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    onClick={() => {
                      setShowOfferForm(false);
                      setOfferCost("");
                      setOfferComment("");
                    }}
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    onClick={handleSubmitOffer}
                    className="flex-1 gap-2"
                    disabled={isSubmitting || !offerCost}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t.common.submitting}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {t.common.submit}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Image Modal */}
        {showImageModal && selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1100] p-4"
            onClick={() => setShowImageModal(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300"
              >
                <X className="w-8 h-8" />
              </button>
              <img
                src={selectedImage}
                alt="Item"
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
