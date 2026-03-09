"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { LiveTrackingMap } from "@/app/components/LiveTrackingMap";
import { Button } from "@/components/ui/button";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { toast } from "sonner";
import Link from "next/link";
import {
  Package,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Banknote,
  Warehouse,
  Navigation,
  MapPinned,
  Truck,
  Box,
  Wrench,
  BoxSelect,
  ChevronDown,
  X,
  CreditCard,
  Loader2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Request,
  Address,
  Warehouse as WarehouseType,
  RequestDeliveryStatus,
} from "@/types";
import { getDistanceKm } from "@/lib/utils";
import dynamic from "next/dynamic";
import { useTranslation } from "@/app/context/LocaleContext";
import { useCategoryLabel } from "@/app/hooks/useCategoryLabel";
import { useRealTime } from "@/app/context/RealTimeContext";
import { useCurrency } from "@/app/context/CurrencyContext";
import { OfferPrice, LockedPriceDisplay } from "@/app/components/PriceDisplay";

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

const statusSteps = [
  { name: RequestDeliveryStatus.PENDING, icon: Clock },
  { name: RequestDeliveryStatus.PICKED_UP_SOURCE, icon: MapPin },
  { name: RequestDeliveryStatus.WAREHOUSE_SOURCE_RECEIVED, icon: Warehouse },
  { name: RequestDeliveryStatus.IN_TRANSIT, icon: Truck },
  {
    name: RequestDeliveryStatus.WAREHOUSE_DESTINATION_RECEIVED,
    icon: Warehouse,
  },
  { name: RequestDeliveryStatus.SHIPMENT_DELIVER, icon: Package },
  { name: RequestDeliveryStatus.DELIVERED, icon: CheckCircle2 },
];

const NEARBY_RADIUS_KM = 50;

export default function RequestDetailsPage() {
  const { t, isRtl, locale } = useTranslation();
  const { getCategoryLabel } = useCategoryLabel();
  const { formatPrice, convert } = useCurrency();
  const { user, isLoading: authLoading } = useProtectedRoute();
  const { subscribe, subscribeToRequest } = useRealTime();
  const params = useParams();
  const requestId = params.id as string;

  // Regular data fetching (not live)
  const [request, setRequest] = useState<Request | null>(null);
  const [requestLoading, setRequestLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [nearbyWarehouses, setNearbyWarehouses] = useState<
    (WarehouseType & { distanceKm: number })[]
  >([]);
  const [locationChecked, setLocationChecked] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmingOffer, setConfirmingOffer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [headoverPercentage, setHeadoverPercentage] = useState(0);
  const [hasShownPaymentNotification, setHasShownPaymentNotification] =
    useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
    id: string;
    status: string;
    amount: number;
    paymentMethod: string;
    breakdown?: {
      walletDeduction?: number;
      cardAmount?: number;
    };
    paidAt?: string;
    createdAt?: string;
  } | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [lastPaymentCheck, setLastPaymentCheck] = useState<Date | null>(null);

  const isClientRole = !["admin", "operator", "company", "driver"].includes(
    user?.role || "",
  );

  const isLoading = authLoading || requestLoading;

  // Fetch request data on mount
  const fetchRequest = useCallback(async () => {
    if (!requestId) return;

    setRequestLoading(true);
    try {
      const response = await fetch(`/api/requests/${requestId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch request");
      }
      const data = await response.json();
      setRequest(data.request || data);
      if (typeof data.headoverPercentage === "number") {
        setHeadoverPercentage(data.headoverPercentage);
      }
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load request");
    } finally {
      setRequestLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Manual refresh function
  const refreshRequest = useCallback(() => {
    fetchRequest();
  }, [fetchRequest]);

  // Fetch payment info for the request
  const fetchPaymentInfo = useCallback(async () => {
    if (!requestId) return;

    setPaymentLoading(true);
    try {
      const response = await fetch(`/api/pay?requestId=${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentInfo(data.payment);
      } else if (response.status !== 404) {
        console.error("Failed to fetch payment info");
      }
    } catch (err) {
      console.error("Error fetching payment:", err);
    } finally {
      setPaymentLoading(false);
    }
  }, [requestId]);

  // Fetch payment info when request has payment data
  useEffect(() => {
    if (request?.paymentStatus && request.paymentStatus !== "unpaid") {
      fetchPaymentInfo();
    }
  }, [request?.paymentStatus, fetchPaymentInfo]);

  // Auto-check payment status by querying Kashier directly
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentInfo?.id) return;

    // Only check if payment is pending or processing
    if (
      paymentInfo.status !== "pending" &&
      paymentInfo.status !== "processing"
    ) {
      return;
    }

    console.log(
      "[Auto-Check] Querying Kashier for real-time payment status...",
    );
    setIsCheckingPayment(true);
    setLastPaymentCheck(new Date());

    try {
      const response = await fetch(`/api/pay/status/${paymentInfo.id}`);

      if (response.ok) {
        const data = await response.json();

        console.log(
          "[Auto-Check] Kashier status:",
          data.kashierStatus,
          "Updated:",
          data.updated,
        );

        if (data.updated) {
          // Status was updated! Refresh UI
          toast.success(
            data.status === "completed"
              ? "Payment confirmed! Your request has been submitted."
              : `Payment status updated: ${data.status}`,
          );

          // Refresh request and payment data
          await Promise.all([fetchRequest(), fetchPaymentInfo()]);
        }
      } else {
        console.error("[Auto-Check] Failed to check payment status");
      }
    } catch (err) {
      console.error("[Auto-Check] Error:", err);
    } finally {
      setIsCheckingPayment(false);
    }
  }, [paymentInfo?.id, paymentInfo?.status, fetchRequest, fetchPaymentInfo]);

  // Auto-check payment on mount and poll every 5 seconds if payment is pending
  // REPLACED WITH WEBHOOK: Listen for real-time payment status updates from webhook
  useEffect(() => {
    if (!requestId) return;

    console.log(
      "[Real-Time] Subscribing to payment events for request:",
      requestId,
    );

    // Subscribe to payment completion events
    const unsubscribeCompleted = subscribe("PAYMENT_COMPLETED", (event) => {
      console.log("[Real-Time] Received PAYMENT_COMPLETED event:", event);

      if (event.payload.requestId === requestId) {
        toast.success("Payment confirmed! Your request has been submitted.");

        // Refresh request and payment data
        fetchRequest();
        fetchPaymentInfo();
      }
    });

    // Subscribe to payment failure events
    const unsubscribeFailed = subscribe("PAYMENT_FAILED", (event) => {
      console.log("[Real-Time] Received PAYMENT_FAILED event:", event);

      if (event.payload.requestId === requestId) {
        toast.error(
          event.payload.message || "Payment failed. Please try again.",
        );

        // Refresh request and payment data
        fetchRequest();
        fetchPaymentInfo();
      }
    });

    // Also subscribe to specific request updates
    const unsubscribeRequest = subscribeToRequest(requestId, (event) => {
      console.log("[Real-Time] Received request event:", event.type);

      if (
        event.type === "PAYMENT_COMPLETED" ||
        event.type === "PAYMENT_FAILED"
      ) {
        // Already handled above
        return;
      }

      // Handle other request updates
      if (event.type === "REQUEST_UPDATED" || event.type === "STATUS_CHANGED") {
        fetchRequest();
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      console.log("[Real-Time] Unsubscribing from payment events");
      unsubscribeCompleted();
      unsubscribeFailed();
      unsubscribeRequest();
    };
  }, [
    requestId,
    subscribe,
    subscribeToRequest,
    fetchRequest,
    fetchPaymentInfo,
  ]);

  // Handle manual payment verification (when webhook fails)
  const handleVerifyPayment = async () => {
    if (!paymentInfo?.id && !requestId) return;

    setPaymentLoading(true);
    try {
      const response = await fetch("/api/pay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: paymentInfo?.id,
          requestId: requestId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Payment verification checked");

        // If Kashier dashboard shows PAID, offer to mark as paid
        if (data.kashierDashboardUrl) {
          const confirmMark = window.confirm(
            "Check Kashier dashboard to confirm payment. If payment shows as PAID, click OK to mark it as completed in our system.",
          );

          if (confirmMark) {
            await handleMarkAsPaid();
          }
        }
      } else {
        toast.error(data.error || "Failed to verify payment");
      }
    } catch (err) {
      toast.error("Failed to verify payment");
      console.error("Verify payment error:", err);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Mark payment as paid manually (after verification)
  const handleMarkAsPaid = async () => {
    if (!paymentInfo?.id) return;

    try {
      const response = await fetch("/api/pay/verify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: paymentInfo.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Payment marked as completed!");
        // Refresh request and payment info
        fetchRequest();
        fetchPaymentInfo();
      } else {
        toast.error(data.error || "Failed to mark payment as paid");
      }
    } catch (err) {
      toast.error("Failed to mark payment as paid");
      console.error("Mark as paid error:", err);
    }
  };

  const findNearbyWarehouses = () => {
    setShowLocationPrompt(true);
  };

  const handleLocationConfirm = () => {
    setShowLocationPrompt(false);
    setLocationError("");
    setLocationLoading(true);
    setLocationChecked(true);

    if (!navigator.geolocation) {
      setLocationError("Location is not supported by your browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        try {
          const res = await fetch("/api/warehouses");
          const data = await res.json();
          const warehouses: WarehouseType[] = data.warehouses || [];
          const withCoords = warehouses.filter(
            (w) =>
              w.latitude != null &&
              w.longitude != null &&
              w.status === "active",
          );
          const withDistance = withCoords
            .map((w) => ({
              ...w,
              distanceKm: getDistanceKm(lat, lng, w.latitude!, w.longitude!),
            }))
            .filter((w) => w.distanceKm <= NEARBY_RADIUS_KM)
            .sort((a, b) => a.distanceKm - b.distanceKm);
          setNearbyWarehouses(withDistance);
        } catch {
          const errorMsg = t.userRequestDetail.warehouseLoadFailed;
          setLocationError(errorMsg);
          toast.error(errorMsg);
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        const errorMsg =
          err.code === 1
            ? "Location permission was denied."
            : "Could not get your location. Please try again.";
        setLocationError(errorMsg);
        toast.error(errorMsg);
        setLocationLoading(false);
      },
    );
  };

  const handleLocationDecline = () => {
    setShowLocationPrompt(false);
  };

  const handleSelectOffer = (offerId: string) => {
    // Update local request state to reflect the selection immediately
    if (request && request.costOffers) {
      const updatedRequest = {
        ...request,
        costOffers: request.costOffers.map((offer) => ({
          ...offer,
          selected: offer._id === offerId,
        })),
      };
      setRequest(updatedRequest);
      setSelectedOfferId(offerId);
      toast.success(t.userRequestDetail.offerSelected);
    }
  };

  const handleSubmitOffer = async () => {
    const selectedOffer = request?.costOffers?.find((o) => o.selected);
    if (!selectedOffer) {
      toast.error(t.userRequestDetail.pleaseSelectOffer);
      return;
    }

    console.log("selected Offer: ", selectedOffer);

    setConfirmingOffer(selectedOffer);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    if (!confirmingOffer || !request) return;

    console.log("confirming Offer: ", confirmingOffer);

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${requestId}/submit-offer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId: confirmingOffer._id, // Use the offer's _id to match the specific offer
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit offer");
      }

      const data = await response.json();

      toast.success(t.userRequestDetail.offerSubmitted);
      setShowConfirmDialog(false);
      setConfirmingOffer(null);

      // Update the local request state with the response data
      if (data.request) {
        setRequest(data.request);
      }

      // Refresh will happen automatically via real-time updates
      // No need to reload the page
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to submit offer";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Data fetching is handled by fetchRequest above
  // Authorization check for non-owners viewing the request
  useEffect(() => {
    if (authLoading || !user || !request) return;

    const userId = user._id || user.id;
    const isAdminRole = ["admin", "operator", "driver"].includes(user.role);
    const reqUser = request.user;
    const requestUserId =
      typeof reqUser === "string"
        ? reqUser
        : String((reqUser as any)?._id || (reqUser as any)?.id || "");

    if (!isAdminRole && requestUserId !== String(userId)) {
      setError(t.userRequestDetail.unauthorized);
      toast.error(t.userRequestDetail.unauthorized);
    }
  }, [authLoading, user, request]);

  // Handle ESC key to close image zoom modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showImageZoom) {
        setShowImageZoom(false);
        setSelectedImageUrl(null);
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [showImageZoom]);

  // Show payment success notification when payment is completed
  useEffect(() => {
    if (
      request?.paymentStatus === "paid" &&
      !hasShownPaymentNotification &&
      request?.requestStatus === "Assigned to Company"
    ) {
      toast.success(
        t.userRequestDetail?.paymentSuccessNotification ||
          "Payment completed successfully! Your shipment is now being processed.",
        {
          duration: 6000,
        },
      );
      setHasShownPaymentNotification(true);
    }
  }, [
    request?.paymentStatus,
    request?.requestStatus,
    hasShownPaymentNotification,
    t,
  ]);

  // test

  const getStatusColor = (status: string) => {
    switch (status) {
      case RequestDeliveryStatus.PENDING:
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-800";
      case RequestDeliveryStatus.PICKED_UP_SOURCE:
      case RequestDeliveryStatus.WAREHOUSE_SOURCE_RECEIVED:
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-300 dark:border-blue-800";
      case RequestDeliveryStatus.IN_TRANSIT:
        return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800";
      case RequestDeliveryStatus.WAREHOUSE_DESTINATION_RECEIVED:
      case RequestDeliveryStatus.SHIPMENT_DELIVER:
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 border border-purple-300 dark:border-purple-800";
      case RequestDeliveryStatus.DELIVERED:
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-300 dark:border-green-800";
      case RequestDeliveryStatus.FAILED:
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-800";
      case "Cancelled":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-300 dark:border-red-800";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  const getCurrentStatusIndex = (status: string) => {
    const index = statusSteps.findIndex((step) => step.name === status);
    return index !== -1 ? index : statusSteps.length - 1;
  };

  const getOrderStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400";
      case "Accepted":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400";
      case "Rejected":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400";
      case "Action needed":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border border-orange-300 dark:border-orange-700";
      default:
        return "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-400";
    }
  };

  const getTranslatedDeliveryStatus = (status: string): string => {
    const statuses = (t.userRequestDetail as any).deliveryStatuses as Record<
      string,
      string
    >;
    return statuses?.[status] ?? status;
  };

  const getTranslatedRequestStatus = (status: string): string => {
    const statuses = (t.userRequestDetail as any).requestStatuses as Record<
      string,
      string
    >;
    return statuses?.[status] ?? status;
  };

  // Translates any status value — checks request statuses first, then delivery statuses
  const getTranslatedAnyStatus = (status: string): string => {
    const req = (t.userRequestDetail as any).requestStatuses as Record<
      string,
      string
    >;
    if (req?.[status]) return req[status];
    const del = (t.userRequestDetail as any).deliveryStatuses as Record<
      string,
      string
    >;
    return del?.[status] ?? status;
  };

  const getTranslatedActivityAction = (action: string): string => {
    const actions = (t.userRequestDetail as any).activityActions as Record<
      string,
      string
    >;
    return (
      actions?.[action] ??
      action
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    );
  };

  const getTranslatedActivityDescription = (activity: any): string => {
    const descs = (t.userRequestDetail as any).activityDescriptions as Record<
      string,
      string
    >;
    const template = descs?.[activity.action];
    if (!template) return activity.description || "";
    return template
      .replace("{companyName}", activity.companyName || "")
      .replace(
        "{cost}",
        activity.cost != null ? Number(activity.cost).toFixed(2) : "",
      )
      .replace("{currency}", activity.currency || "USD")
      .replace("{warehouseName}", activity.details?.warehouseName || "")
      .replace(
        "{type}",
        activity.details?.type === "source"
          ? (descs?.warehouse_type_source ?? "source")
          : (descs?.warehouse_type_destination ?? "destination"),
      )
      .replace(
        "{oldStatus}",
        getTranslatedAnyStatus(activity.details?.oldStatus || ""),
      )
      .replace(
        "{newStatus}",
        getTranslatedAnyStatus(activity.details?.newStatus || ""),
      );
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-red-800 dark:text-red-400 mb-2">
                {t.userRequestDetail.errorTitle}
              </h2>
              <p className="text-red-700 dark:text-red-400">
                {error || t.userRequestDetail.requestNotFound}
              </p>
              <Link href="/my-requests" className="mt-4 inline-block">
                <Button className="cursor-pointer" variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.userRequestDetail.backToRequests}
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/my-requests" className="inline-block mb-6">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.userRequestDetail.backToRequests}
          </Button>
        </Link>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-card rounded-lg border border-border p-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {request.publicId}
                </h1>
              </div>
              <div className="flex gap-2">
                <span
                  className={`px-4 py-2 w-max rounded-full text-sm font-semibold ${getOrderStatusBadgeColor(request.requestStatus)}`}
                >
                  {t.userRequestDetail.orderStatus}{" "}
                  {getTranslatedRequestStatus(request.requestStatus)}
                </span>
              </div>
            </div>

            {/* Proceed to Checkout - Show when offer confirmed (Action needed status) and not paid/pending */}
            {request.requestStatus === "Action needed" &&
              request.selectedCompany &&
              request.paymentStatus === "unpaid" && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-linear-to-r from-primary/10 to-primary/5 rounded-lg p-6">
                    <div className="text-center sm:text-left">
                      <h3 className="font-semibold text-lg text-foreground mb-1">
                        {t.userRequestDetail?.readyForPayment ||
                          "Ready for Payment"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t.userRequestDetail?.payToStartDesc ||
                          "Complete your payment to start your shipment"}
                      </p>
                      <p className="text-2xl font-bold text-primary mt-2">
                        $
                        {(
                          request.selectedCompany.finalPrice ||
                          request.selectedCompany.cost
                        ).toFixed(2)}
                      </p>
                    </div>
                    <Link href={`/checkout?requestId=${requestId}`}>
                      <Button size="lg" className="cursor-pointer gap-2 px-8">
                        <CreditCard className="w-5 h-5" />
                        {t.userRequestDetail?.proceedToCheckout ||
                          "Proceed to Checkout"}
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

            {/* Payment Status Section - Webhook-based updates */}
            {/* Payment Pending - Waiting for webhook */}
            {request.paymentStatus === "pending" && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      {isCheckingPayment ? (
                        <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-yellow-800 dark:text-yellow-400">
                        {t.userRequestDetail?.paymentPending ||
                          "Payment Pending"}
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-500">
                        {isCheckingPayment
                          ? "Checking payment status with Kashier..."
                          : "Waiting for payment confirmation from Kashier..."}
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-600 mt-1">
                        Status will update automatically when payment is
                        confirmed
                      </p>
                    </div>
                  </div>

                  {/* Manual check button (fallback if webhook fails) */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-yellow-200 dark:border-yellow-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        checkPaymentStatus();
                      }}
                      disabled={isCheckingPayment}
                      className="cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 ${isCheckingPayment ? "animate-spin" : ""}`}
                      />
                      {t.userRequestDetail?.refresh || "Check Status Manually"}
                    </Button>
                  </div>

                  <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-3">
                    💡 If payment status doesn&apos;t update automatically after
                    completing payment, click &quot;Check Status Manually&quot;
                  </p>
                </div>
              </div>
            )}

            {/* Payment Processing */}
            {(paymentInfo?.status === "processing" ||
              paymentInfo?.status === "pending") &&
              request.paymentStatus !== "paid" &&
              request.paymentStatus !== "failed" && (
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-blue-800 dark:text-blue-400">
                        {t.userRequestDetail?.paymentProcessing ||
                          "Processing Payment"}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-500">
                        {t.userRequestDetail?.paymentProcessingDesc ||
                          "We are verifying your payment with the payment provider."}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        fetchRequest();
                        fetchPaymentInfo();
                      }}
                      className="cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

            {/* Payment Failed */}
            {request.paymentStatus === "failed" && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 dark:text-red-400">
                      {t.userRequestDetail?.paymentFailed || "Payment Failed"}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-500">
                      {t.userRequestDetail?.paymentFailedDesc ||
                        "Your payment could not be processed. Please try again."}
                    </p>
                  </div>
                  <Link href={`/checkout?requestId=${requestId}`}>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="cursor-pointer gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {t.userRequestDetail?.retryPayment || "Retry Payment"}
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Payment Completed - Enhanced with details */}
            {request.paymentStatus === "paid" && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-400">
                        {t.userRequestDetail?.paymentCompleted ||
                          "Payment Completed"}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-500">
                        {t.userRequestDetail?.paidAmount || "Paid"}: $
                        {request.paidAmount?.toFixed(2) ||
                          request.selectedCompany?.cost.toFixed(2)}
                        {request.paidAt &&
                          ` • ${new Date(request.paidAt).toLocaleDateString(locale)}`}
                      </p>
                    </div>
                  </div>

                  {/* Payment Details */}
                  {paymentInfo && (
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800 grid grid-cols-2 gap-3 text-sm">
                      {paymentInfo.paymentMethod && (
                        <div>
                          <p className="text-green-600 dark:text-green-500 text-xs">
                            {t.userRequestDetail?.paymentMethod ||
                              "Payment Method"}
                          </p>
                          <p className="font-medium text-green-800 dark:text-green-400">
                            {paymentInfo.paymentMethod === "card"
                              ? t.userRequestDetail?.cardPayment ||
                                "Card Payment"
                              : paymentInfo.paymentMethod === "wallet"
                                ? t.userRequestDetail?.walletPayment ||
                                  "Wallet Payment"
                                : t.userRequestDetail?.mixedPayment ||
                                  "Card + Wallet"}
                          </p>
                        </div>
                      )}
                      {paymentInfo.breakdown?.walletDeduction &&
                        paymentInfo.breakdown.walletDeduction > 0 && (
                          <div>
                            <p className="text-green-600 dark:text-green-500 text-xs">
                              {t.userRequestDetail?.walletPayment ||
                                "Wallet Payment"}
                            </p>
                            <p className="font-medium text-green-800 dark:text-green-400">
                              $
                              {paymentInfo.breakdown.walletDeduction.toFixed(2)}
                            </p>
                          </div>
                        )}
                      {paymentInfo.breakdown?.cardAmount &&
                        paymentInfo.breakdown.cardAmount > 0 && (
                          <div>
                            <p className="text-green-600 dark:text-green-500 text-xs">
                              {t.userRequestDetail?.cardPayment ||
                                "Card Payment"}
                            </p>
                            <p className="font-medium text-green-800 dark:text-green-400">
                              ${paymentInfo.breakdown.cardAmount.toFixed(2)}
                            </p>
                          </div>
                        )}
                      {paymentInfo.id && (
                        <div className="col-span-2">
                          <p className="text-green-600 dark:text-green-500 text-xs">
                            {t.userRequestDetail?.transactionId ||
                              "Transaction ID"}
                          </p>
                          <p className="font-medium text-green-800 dark:text-green-400 font-mono text-xs">
                            {paymentInfo.id}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Tracking Map - Only show when In Transit or later */}
          {/* {(request.deliveryStatus === RequestDeliveryStatus.IN_TRANSIT ||
            request.deliveryStatus ===
              RequestDeliveryStatus.WAREHOUSE_DESTINATION_RECEIVED ||
            request.deliveryStatus ===
              RequestDeliveryStatus.SHIPMENT_DELIVER) &&
            request.source &&
            request.destination && (
              <LiveTrackingMap
                from={request.source.country}
                to={request.destination.country}
                isInTransit={true}
              />
            )} */}

          {/* Location permission dialog - ask before sharing */}
          {showLocationPrompt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPinned className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {t.userRequestDetail.shareLocation}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.userRequestDetail.locationDesc.replace(
                        "{km}",
                        String(NEARBY_RADIUS_KM),
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleLocationConfirm}
                    className="flex-1 cursor-pointer"
                  >
                    {t.userRequestDetail.allow}
                  </Button>
                  <Button
                    onClick={handleLocationDecline}
                    variant="outline"
                    className="flex-1 bg-transparent cursor-pointer"
                  >
                    {t.userRequestDetail.notNow}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Status Timeline - Redesigned */}
          <div className="bg-card rounded-lg border border-border p-8">
            <h2 className="text-xl font-semibold text-foreground mb-8">
              {t.userRequestDetail.shipmentProgress}
            </h2>

            {/* Timeline Container */}
            <div className="relative">
              {/* Desktop: Horizontal Timeline */}
              <div className="hidden md:block">
                {/* Progress Bar Background */}
                <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full" />

                {/* Progress Bar Fill */}
                <div
                  className="absolute top-6 h-1 bg-primary rounded-full transition-all duration-500"
                  style={{
                    width: `${(getCurrentStatusIndex(request.deliveryStatus) / (statusSteps.length - 1)) * 100}%`,
                    ...(isRtl ? { right: 0 } : { left: 0 }),
                  }}
                />

                {/* Steps */}
                <div className="flex justify-between relative z-10">
                  {statusSteps.map((step, index) => {
                    const Icon = step.icon;
                    const currentIndex = getCurrentStatusIndex(
                      request.deliveryStatus,
                    );
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                      <div
                        key={step.name}
                        className="flex flex-col items-center"
                      >
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all border-2 ${
                            isCompleted
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-muted"
                          } ${isCurrent ? "ring-4 ring-primary/30" : ""}`}
                        >
                          <Icon className="w-7 h-7" />
                        </div>
                        <span
                          className={`text-xs font-semibold text-center max-w-[100px] transition-colors ${
                            isCurrent
                              ? "text-primary"
                              : isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {getTranslatedDeliveryStatus(step.name)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile: Vertical Timeline */}
              <div className="md:hidden space-y-6">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const currentIndex = getCurrentStatusIndex(
                    request.deliveryStatus,
                  );
                  const isCompleted = index <= currentIndex;
                  const isCurrent = index === currentIndex;

                  return (
                    <div key={step.name} className="flex gap-4">
                      {/* Timeline Line and Dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border-2 flex-shrink-0 ${
                            isCompleted
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-muted"
                          } ${isCurrent ? "ring-4 ring-primary/30" : ""}`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                        {index < statusSteps.length - 1 && (
                          <div
                            className={`w-1 h-16 my-2 transition-colors ${
                              isCompleted ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        )}
                      </div>

                      {/* Status Content */}
                      <div className="pb-4 flex-1">
                        <h4
                          className={`font-semibold transition-colors ${
                            isCurrent
                              ? "text-primary"
                              : isCompleted
                                ? "text-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {getTranslatedDeliveryStatus(step.name)}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isCurrent
                            ? t.userRequestDetail.currentStep
                            : isCompleted
                              ? t.userRequestDetail.completed
                              : t.userRequestDetail.pending}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Summary Card */}
            <div className="mt-8 pt-6 border-t border-border">
              {/* Accepted offer price banner */}
              {request.selectedCompany &&
                request.requestStatus === "Assigned to Company" && (
                  <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 mb-4">
                    <div>
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                        {t.userRequestDetail.acceptedOffer}
                      </p>
                      <p className="text-xl font-bold text-green-800 dark:text-green-200">
                        {
                          convert(
                            Number(
                              request.selectedCompany.finalPrice ??
                                request.selectedCompany.cost,
                            ),
                            (request.selectedCompany as any).currency || "USD",
                          ).formatted
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-green-700 dark:text-green-300">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold">
                        {request.selectedCompany.rate}
                      </span>
                    </div>
                  </div>
                )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t.userRequestDetail.currentDeliveryStatus}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {getTranslatedDeliveryStatus(request.deliveryStatus)}
                  </p>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t.userRequestDetail.progress}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(getCurrentStatusIndex(request.deliveryStatus) / (statusSteps.length - 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground ml-2">
                      {Math.round(
                        (getCurrentStatusIndex(request.deliveryStatus) /
                          (statusSteps.length - 1)) *
                          100,
                      )}
                      %
                    </span>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {t.userRequestDetail.stepsRemaining}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {Math.max(
                      0,
                      statusSteps.length -
                        1 -
                        getCurrentStatusIndex(request.deliveryStatus),
                    )}{" "}
                    {t.userRequestDetail.of} {statusSteps.length - 1}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Offers Section - Show when Action needed */}
          {request.requestStatus === "Action needed" &&
            request.costOffers &&
            request.costOffers.length > 0 && (
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-foreground mb-1">
                    {t.userRequestDetail.shippingOffers}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t.userRequestDetail.chooseCompany}
                  </p>
                </div>

                <div className="max-h-[300px] overflow-y-auto pr-2 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {request.costOffers.map((offer, idx) => (
                      <div
                        key={offer._id || idx}
                        onClick={() =>
                          offer._id && handleSelectOffer(offer._id)
                        }
                        className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                          offer.selected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                        }`}
                      >
                        {/* Selected Badge */}
                        {offer.selected && (
                          <div className="absolute -top-2 -right-2">
                            <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-semibold shadow-sm">
                              <CheckCircle2 className="w-3 h-3" />
                              {t.userRequestDetail.selected}
                            </div>
                          </div>
                        )}

                        {/* Option Label */}
                        <div className="mb-3">
                          <h3 className="text-base font-bold text-foreground mb-1">
                            {t.userRequestDetail.option} {idx + 1}
                          </h3>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500 text-sm">★</span>
                            <span className="text-sm font-semibold text-foreground">
                              {offer.company.rate}
                            </span>
                          </div>
                        </div>

                        {/* Cost */}
                        <div className="mb-3 p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-md border border-amber-200/50 dark:border-amber-800/50">
                          <OfferPrice
                            cost={offer.cost}
                            currency={(offer as any).currency}
                            finalPrice={offer.finalPrice}
                            className="text-2xl font-bold text-foreground"
                          />
                        </div>

                        {/* Delivery Reason */}
                        {offer.comment && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {offer.comment}
                          </p>
                        )}

                        {/* Pickup DateTime */}
                        {offer.pickupDateTime && (
                          <div className="mb-2 text-xs text-muted-foreground">
                            <span className="font-medium">
                              {t.userRequestDetail.pickup}
                            </span>{" "}
                            {new Date(offer.pickupDateTime).toLocaleString(
                              locale,
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                              },
                            )}
                          </div>
                        )}

                        {/* Delivery DateTime */}
                        {offer.deliveryDateTime && (
                          <div className="mb-3 text-xs text-muted-foreground">
                            <span className="font-medium">
                              {t.userRequestDetail.delivery}
                            </span>{" "}
                            {new Date(offer.deliveryDateTime).toLocaleString(
                              locale,
                              {
                                dateStyle: "medium",
                                timeStyle: "short",
                              },
                            )}
                          </div>
                        )}

                        {/* Select Indicator */}
                        <div
                          className={`text-center text-xs font-medium py-1 rounded ${
                            offer.selected
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {offer.selected
                            ? t.userRequestDetail.yourChoice
                            : t.userRequestDetail.clickToSelect}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-4">
                  <Button
                    onClick={handleSubmitOffer}
                    className="w-full bg-primary text-primary-foreground cursor-pointer"
                  >
                    {t.userRequestDetail.submitSelectedOffer}
                  </Button>
                </div>
              </div>
            )}

          {/* Confirmation Dialog */}
          {showConfirmDialog && confirmingOffer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 h-full">
              <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">
                      {t.userRequestDetail.confirmSelection}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t.userRequestDetail.confirmOfferQuestion}
                    </p>
                  </div>
                </div>

                {/* Offer Details */}
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold text-foreground">
                      {confirmingOffer.company.rate}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary mb-2">
                    {
                      convert(
                        confirmingOffer.finalPrice ?? confirmingOffer.cost,
                        (confirmingOffer as any).currency || "USD",
                      ).formatted
                    }
                  </p>
                  {confirmingOffer.comment && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {confirmingOffer.comment}
                    </p>
                  )}

                  {/* Display pickup/delivery datetime if present */}
                  {confirmingOffer.pickupDateTime && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {t.userRequestDetail.pickup}
                      </p>
                      <p className="text-sm text-foreground">
                        {new Date(
                          confirmingOffer.pickupDateTime,
                        ).toLocaleString(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  )}
                  {confirmingOffer.deliveryDateTime && (
                    <div
                      className={`${confirmingOffer.pickupDateTime ? "mt-2" : "mt-3 pt-3 border-t border-border"}`}
                    >
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {t.userRequestDetail.delivery}
                      </p>
                      <p className="text-sm text-foreground">
                        {new Date(
                          confirmingOffer.deliveryDateTime,
                        ).toLocaleString(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setConfirmingOffer(null);
                    }}
                    variant="outline"
                    className="flex-1 bg-transparent cursor-pointer"
                    disabled={isSubmitting}
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    onClick={handleConfirmSubmit}
                    className="flex-1 bg-primary text-primary-foreground cursor-pointer"
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? t.userRequestDetail.submitting
                      : t.userRequestDetail.yesConfirm}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Route Details */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {t.userRequestDetail.routeDetails}
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t.userRequestDetail.from}
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    {request.source
                      ? formatLocation(request.source)
                      : request.from
                        ? formatLocation(request.from)
                        : "-"}
                  </p>
                </div>
                <div className="border-l-2 border-primary h-8" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t.userRequestDetail.to}
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    {request.destination
                      ? formatLocation(request.destination)
                      : request.to
                        ? formatLocation(request.to)
                        : "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Package Details - All Items */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {t.userRequestDetail.shipmentItems} (
                {request.items?.length || 0})
              </h3>

              <div className="max-h-52 overflow-y-auto pr-2 space-y-4   p-2 rounded-md">
                {request.items && request.items.length > 0 ? (
                  request.items.map((item, idx) => (
                    <div
                      key={item._id || `item-${idx}`}
                      className="border border-border rounded-lg p-4 bg-white dark:bg-gray-900"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                              {idx + 1}
                            </span>
                            {item.name || item.item}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getCategoryLabel(item.category)}
                          </p>
                        </div>
                        {item.quantity > 1 && (
                          <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                            ×{item.quantity}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t.userRequestDetail.dimensions}
                          </p>
                          <p className="font-medium text-foreground">
                            {item.dimensions}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t.userRequestDetail.weight}
                          </p>
                          <p className="font-medium text-foreground">
                            {item.weight} kg
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {t.userRequestDetail.quantity}
                          </p>
                          <p className="font-medium text-foreground">
                            {item.quantity}
                          </p>
                        </div>
                      </div>
                      {item.note && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            {t.userRequestDetail.note}
                          </p>
                          <p className="text-sm text-foreground italic">
                            {item.note}
                          </p>
                        </div>
                      )}
                      {item.media && item.media.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-2">
                            {t.userRequestDetail.media} ({item.media.length})
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {item.media.map((mediaItem, mIdx) => {
                              const url =
                                typeof mediaItem === "string"
                                  ? mediaItem
                                  : mediaItem.url;
                              return (
                                <img
                                  key={mIdx}
                                  src={url}
                                  alt={`Item ${idx + 1} - Media ${mIdx + 1}`}
                                  className="w-16 h-16 rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => {
                                    setSelectedImageUrl(url);
                                    setShowImageZoom(true);
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {item.services &&
                        (item.services.canBeAssembledDisassembled ||
                          item.services.assemblyDisassembly ||
                          item.services.packaging) && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-2">
                              {t.userRequestDetail.services}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(item.services.canBeAssembledDisassembled ||
                                item.services.assemblyDisassembly) && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  <Wrench className="w-3 h-3" />
                                  {t.userRequestDetail.assemblyDisassembly}
                                  {item.services.assemblyDisassemblyHandler && (
                                    <span className="ml-1 text-[10px]">
                                      (
                                      {item.services
                                        .assemblyDisassemblyHandler === "self"
                                        ? t.userRequestDetail.assemblySelf
                                        : t.userRequestDetail.assemblyCompany}
                                      )
                                    </span>
                                  )}
                                </span>
                              )}
                              {item.services.packaging && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  <BoxSelect className="w-3 h-3" />
                                  {t.userRequestDetail.packaging}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    {t.userRequestDetail.noItems}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Timing & Delivery Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  {t.userRequestDetail.requestedDate}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {request.createdAt
                    ? new Date(request.createdAt).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "-"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {request.createdAt
                    ? new Date(request.createdAt).toLocaleTimeString(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </p>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600 dark:text-green-400 min-w-min" />
                  {t.userRequestDetail.collectionAvailableDays}
                </h3>
                {request.collectionAvailableDays &&
                request.collectionAvailableDays.length > 0 ? (
                  request.collectionAvailableDays.includes("All Week") ? (
                    <span className="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
                      {t.common.allWeek}
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {request.collectionAvailableDays.map((day: string) => (
                        <span
                          key={day}
                          className="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t.userRequestDetail.noSpecificDays}
                  </p>
                )}
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 min-w-min" />
                  {t.userRequestDetail.deliveryAvailableDays}
                </h3>
                {request.deliveryAvailableDays &&
                request.deliveryAvailableDays.length > 0 ? (
                  request.deliveryAvailableDays.includes("All Week") ? (
                    <span className="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {t.common.allWeek}
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {request.deliveryAvailableDays.map((day: string) => (
                        <span
                          key={day}
                          className="inline-flex items-center text-xs font-medium rounded-full px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t.userRequestDetail.noSpecificDays}
                  </p>
                )}
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary min-w-min" />
                  {t.userRequestDetail.deliveryType}
                </h3>
                <p className="text-base font-medium w-max text-foreground capitalize">
                  {request.deliveryType === "Urgent"
                    ? t.userRequestDetail.urgentDelivery
                    : t.userRequestDetail.normalDelivery}
                </p>
                {request.deliveryType === "Urgent" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.userRequestDetail.urgentSurcharge}
                  </p>
                )}
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary min-w-min" />
                  {t.userRequestDetail.cost}
                </h3>
                {/* Always show primary/estimated cost */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-base font-medium ${request.selectedCompany && request.requestStatus === "Assigned to Company" ? "line-through text-muted-foreground" : "text-foreground"}`}
                    >
                      {
                        // request.primaryCost && Number(request.primaryCost) > 0
                        //   ? convert(Number(request.primaryCost), "USD").formatted
                        //   :
                        request.cost && Number(request.cost) > 0
                          ? convert(Number(request.cost), "USD").formatted
                          : t.userRequestDetail.notCalculated
                      }
                    </p>
                    {/* <span className="text-xs text-muted-foreground">
                      {t.userRequestDetail.estimated}
                    </span> */}
                  </div>
                  {/* Show accepted offer price when available */}
                  {request.selectedCompany &&
                    request.requestStatus === "Assigned to Company" && (
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-bold text-primary">
                          {
                            convert(
                              Number(
                                request.selectedCompany.finalPrice ??
                                  request.selectedCompany.cost,
                              ),
                              (request.selectedCompany as any).currency ||
                                "USD",
                            ).formatted
                          }
                        </p>
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {t.userRequestDetail.acceptedOffer}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-6 h-fit">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary min-w-min" />
                {t.userRequestDetail.activityLog}
              </h3>

              {/* Last updated time */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <span>{t.userRequestDetail.updated}</span>
                <span className="font-medium text-foreground">
                  {request.updatedAt
                    ? `${new Date(request.updatedAt).toLocaleDateString(
                        locale,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )} ${new Date(request.updatedAt).toLocaleTimeString(
                        locale,
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}`
                    : "-"}
                </span>
              </div>

              {/* Selected offer info */}
              {request.selectedCompany &&
                request.requestStatus === "Assigned to Company" && (
                  <div className="mb-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t.userRequestDetail.acceptedOfferLabel}
                        </p>
                        <p className="text-sm font-semibold text-primary">
                          {
                            convert(
                              Number(
                                request.selectedCompany.finalPrice ??
                                  request.selectedCompany.cost,
                              ),
                              (request.selectedCompany as any).currency ||
                                "USD",
                            ).formatted
                          }
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-background rounded-full px-2 py-1">
                        <span className="text-yellow-500 text-sm">★</span>
                        <span className="text-sm font-bold text-foreground">
                          {request.selectedCompany.rate}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              {/* Activity entries */}
              {request.activityHistory && request.activityHistory.length > 0 ? (
                <div className="space-y-3 h-48 max-h-48 overflow-y-auto pr-1">
                  {[...request.activityHistory]
                    .reverse()
                    .map((activity, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 text-sm border-primary py-2 ${isRtl ? "border-r-2 pr-3" : "border-l-2 pl-3"}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Action and timestamp */}
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <p className="font-medium text-foreground">
                              {getTranslatedActivityAction(activity.action)}
                            </p>
                            <time className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(activity.timestamp).toLocaleDateString(
                                locale,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </time>
                          </div>

                          {/* Description */}
                          {(activity.action || activity.description) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {getTranslatedActivityDescription(
                                isClientRole &&
                                  activity.action === "offer_submitted"
                                  ? {
                                      ...activity,
                                      companyName: "A company",
                                      cost:
                                        activity.cost != null
                                          ? activity.cost *
                                            (1 + headoverPercentage / 100)
                                          : activity.cost,
                                    }
                                  : activity,
                              )}
                            </p>
                          )}

                          {/* Note display - show if present in details */}
                          {activity.details?.note && (
                            <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                                <span>📝</span>
                                <span>{t.userRequestDetail.note}:</span>
                              </p>
                              <p className="text-sm text-amber-900 dark:text-amber-200 mt-0.5">
                                {activity.details.note}
                              </p>
                            </div>
                          )}

                          {/* Company info and cost */}
                          <div className="flex flex-wrap gap-3 mt-2">
                            {activity.companyName &&
                              !(
                                isClientRole &&
                                activity.action === "offer_submitted"
                              ) && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">
                                    {t.userRequestDetail.company}{" "}
                                  </span>
                                  <span className="text-foreground font-medium">
                                    {activity.companyName}
                                  </span>
                                </div>
                              )}
                            {activity.cost !== undefined &&
                              activity.cost !== null && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">
                                    {t.userRequestDetail.costLabel}{" "}
                                  </span>
                                  <span className="text-primary font-semibold">
                                    {
                                      convert(
                                        Number(
                                          isClientRole &&
                                            activity.action ===
                                              "offer_submitted"
                                            ? activity.cost *
                                                (1 + headoverPercentage / 100)
                                            : activity.cost,
                                        ),
                                        activity.currency || "USD",
                                      ).formatted
                                    }
                                  </span>
                                </div>
                              )}
                            {activity.companyRate &&
                              !(
                                isClientRole &&
                                activity.action === "offer_submitted"
                              ) && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">
                                    {t.userRequestDetail.rateLabel}{" "}
                                  </span>
                                  <span className="text-foreground">
                                    {activity.companyRate} ⭐
                                  </span>
                                </div>
                              )}
                          </div>

                          {/* Additional details if present */}
                          {/* {activity.details &&
                            Object.keys(activity.details).length > 0 && (
                              <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/30 rounded">
                                <details className="cursor-pointer">
                                  <summary className="font-medium text-foreground hover:text-primary transition-colors">
                                    More details
                                  </summary>
                                  <pre className="mt-1 text-xs overflow-auto whitespace-pre-wrap break-words">
                                    {JSON.stringify(activity.details, null, 2)}
                                  </pre>
                                </details>
                              </div>
                            )} */}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t.userRequestDetail.noActivity}
                </p>
              )}
            </div>
          </div>

          {/* Warehouse Locations Section - Show when warehouses are assigned */}
          {(request.sourceWarehouse || request.destinationWarehouse) && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-primary" />
                {t.userRequestDetail.assignedWarehouses}
              </h3>

              {/* Show accordion for warehouses - always use accordion structure */}
              <Accordion type="single" className="space-y-3">
                {/* Source Warehouse */}
                {request.sourceWarehouse && (
                  <AccordionItem
                    value="source"
                    className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                  >
                    <AccordionTrigger value="source" className="bg-transparent">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">
                            {t.userRequestDetail.sourceWarehouse}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.sourceWarehouse.name}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent
                      value="source"
                      className="bg-white/50 dark:bg-gray-900/50"
                    >
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {t.userRequestDetail.warehouseName}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {request.sourceWarehouse.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {t.userRequestDetail.address}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {request.sourceWarehouse.address}
                          </p>
                          {(request.sourceWarehouse.city ||
                            request.sourceWarehouse.country) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {[
                                request.sourceWarehouse.city,
                                request.sourceWarehouse.country,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                        {request.sourceWarehouse.assignedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {t.userRequestDetail.assignedOn}
                            </p>
                            <p className="text-sm text-foreground">
                              {new Date(
                                request.sourceWarehouse.assignedAt,
                              ).toLocaleDateString(locale, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        )}
                        {request.sourceWarehouse.coordinates && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">
                              {t.userRequestDetail.locationOnMap}
                            </p>
                            <div className="h-64 w-full rounded-lg overflow-hidden border border-border">
                              <LocationMapPicker
                                position={{
                                  lat: request.sourceWarehouse.coordinates
                                    .latitude,
                                  lng: request.sourceWarehouse.coordinates
                                    .longitude,
                                }}
                                onPositionChange={() => {}}
                                editable={false}
                                showUseMyLocation={false}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Destination Warehouse */}
                {request.destinationWarehouse && (
                  <AccordionItem
                    value="destination"
                    className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                  >
                    <AccordionTrigger
                      value="destination"
                      className="bg-transparent"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <MapPinned className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-foreground">
                            {t.userRequestDetail.destinationWarehouse}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.destinationWarehouse.name}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent
                      value="destination"
                      className="bg-white/50 dark:bg-gray-900/50"
                    >
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {t.userRequestDetail.warehouseName}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {request.destinationWarehouse.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {t.userRequestDetail.address}
                          </p>
                          <p className="text-sm font-medium text-foreground">
                            {request.destinationWarehouse.address}
                          </p>
                          {(request.destinationWarehouse.city ||
                            request.destinationWarehouse.country) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {[
                                request.destinationWarehouse.city,
                                request.destinationWarehouse.country,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                        {request.destinationWarehouse.assignedAt && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {t.userRequestDetail.assignedOn}
                            </p>
                            <p className="text-sm text-foreground">
                              {new Date(
                                request.destinationWarehouse.assignedAt,
                              ).toLocaleDateString(locale, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        )}
                        {request.destinationWarehouse.coordinates && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">
                              {t.userRequestDetail.locationOnMap}
                            </p>
                            <div className="h-64 w-full rounded-lg overflow-hidden border border-border">
                              <LocationMapPicker
                                position={{
                                  lat: request.destinationWarehouse.coordinates
                                    .latitude,
                                  lng: request.destinationWarehouse.coordinates
                                    .longitude,
                                }}
                                onPositionChange={() => {}}
                                editable={false}
                                showUseMyLocation={false}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Link href="/my-requests" className="flex-1">
              <Button
                variant="outline"
                className="w-full bg-transparent cursor-pointer"
              >
                {t.userRequestDetail.backToRequests}
              </Button>
            </Link>
            <Link href="/new-request" className="flex-1">
              <Button className="w-full cursor-pointer">
                {t.userRequestDetail.createNewRequest}
              </Button>
            </Link>
          </div>

          {/* Image Zoom Modal */}
          {showImageZoom && selectedImageUrl && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => {
                setShowImageZoom(false);
                setSelectedImageUrl(null);
              }}
            >
              <div
                className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedImageUrl}
                  alt="Zoomed image"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <button
                  onClick={() => {
                    setShowImageZoom(false);
                    setSelectedImageUrl(null);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-gray-900/50 hover:bg-gray-900 text-white transition-colors cursor-pointer"
                  aria-label="Close zoomed image"
                >
                  <X className="w-6 h-6" />
                </button>
                <p className="absolute bottom-4 left-4 right-4 text-center text-sm text-gray-300">
                  {t.userRequestDetail.clickToClose}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
