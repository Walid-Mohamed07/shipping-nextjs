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
  Ruler,
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
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTranslation } from "@/app/context/LocaleContext";

// Dynamically import map component
const SimpleLocationMap = dynamic(
  () =>
    import("@/app/components/SimpleLocationMap").then(
      (mod) => mod.SimpleLocationMap,
    ),
  {
    ssr: false,
    loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" />,
  },
);

interface CompanyInfo {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  rate?: string;
}

export default function CompanyRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { create, error: showError } = useToast();

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
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Offer form state
  const [offerCost, setOfferCost] = useState("");
  const [offerComment, setOfferComment] = useState("");
  const [showOfferForm, setShowOfferForm] = useState(false);

  // UI state
  const [expandedItems, setExpandedItems] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mapView, setMapView] = useState<"pickup" | "delivery">("pickup");
  const { t } = useTranslation();

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
        event.payload.companyId !== user?.id
      ) {
        toast.info(t.companyRequestDetail.toastOfferSubmitted.split(".")[0], {
          description: "The competition is on!",
        });
      } else if (event.type === "OFFER_ACCEPTED") {
        if (event.payload.companyId === user?.id) {
          toast.success(t.company.offerAccepted, {
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

  const fetchCompanyInfo = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`/api/company/profile?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setCompanyInfo(data);
      } else {
        console.error("Failed to fetch company profile");
      }
    } catch (error) {
      console.error("Failed to fetch company info:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "company") {
      router.push("/");
      return;
    }
    fetchCompanyInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role, authLoading]);

  const getMyOffers = (request: Request | null): CostOffer[] => {
    if (!request) return [];
    return (
      request.costOffers?.filter((offer) => offer.company.id === user?.id) || []
    );
  };

  const handleSubmitOffer = async () => {
    if (!offerCost) {
      showError(t.companyRequestDetail.enterCost);
      return;
    }

    const cost = parseFloat(offerCost);
    if (isNaN(cost) || cost <= 0) {
      showError(t.companyRequestDetail.enterValidCost);
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/company/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-offer",
          requestId,
          companyId: user?.id,
          company: companyInfo || {
            id: user?.id,
            name: user?.fullName || user?.name,
            email: user?.email,
          },
          offer: {
            cost,
            comment: offerComment || "",
            companyName: companyInfo?.name || user?.fullName || user?.name,
          },
        }),
      });

      if (response.ok) {
        const hasExisting =
          request?.costOffers?.some((o) => o.company.id === user?.id) ?? false;
        create(
          hasExisting
            ? t.companyRequestDetail.toastOfferUpdated
            : t.companyRequestDetail.toastOfferSubmitted,
        );
        setOfferCost("");
        setOfferComment("");
        setShowOfferForm(false);
        // Refresh will happen automatically via real-time updates
        // But also trigger manual refresh for immediate feedback
        await refreshRequest();
      } else {
        const errorData = await response.json();
        showError(errorData.error || t.companyRequestDetail.toastFailedSubmit);
      }
    } catch (error) {
      console.error("Failed to submit offer:", error);
      showError(t.companyRequestDetail.toastFailedSubmit);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (
      !confirm(t.companyRequestDetail.confirmReject)
    ) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/company/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject-request",
          requestId,
          companyId: user?.id,
          companyName: companyInfo?.name || user?.fullName,
        }),
      });

      if (response.ok) {
        create("Request rejected successfully");
        router.push("/company/requests");
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200";
      case "Accepted":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200";
      case "Action needed":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200";
      case "Assigned to Company":
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
          <Link href="/company/requests">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.companyRequestDetail.backToRequests}
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
        <Link href="/company/requests">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.companyRequestDetail.backToRequests}
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
    <AuthGuard requiredRole="company">
      <div className="min-h-screen bg-background">
        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/company/requests">
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
                  {/* Real-time connection indicator */}
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
                    {request.requestStatus}
                  </Badge>
                  <Badge
                    className={getDeliveryStatusColor(request.deliveryStatus)}
                  >
                    {request.deliveryStatus}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div className="flex items-center gap-1 justify-end">
                <Calendar className="w-3 h-3" />
                {new Date(request.createdAt!).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Route */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {t.companyRequestDetail.shippingRoute}
                  </h3>
                  
                  {/* Map Toggle */}
                  {(request.source.coordinates || request.destination.coordinates) && (
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border">
                      <button
                        onClick={() => setMapView("pickup")}
                        className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                          mapView === "pickup"
                            ? "bg-green-500 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.companyRequestDetail.pickup}
                      </button>
                      <button
                        onClick={() => setMapView("delivery")}
                        className={`px-3 py-1.5 text-sm font-medium rounded transition-all ${
                          mapView === "delivery"
                            ? "bg-blue-500 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.companyRequestDetail.delivery}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Pickup Location */}
                  {mapView === "pickup" && (
                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-base font-semibold text-green-700 dark:text-green-300">
                              {t.companyRequestDetail.pickupLocation}
                            </h4>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300">
                              {request.sourcePickupMode === "Self" ? t.companyRequestDetail.selfPickup : t.companyRequestDetail.companyPickup}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <p className="font-medium text-foreground">
                              {request.source.city}, {request.source.country}
                            </p>
                            {request.source.street && (
                              <p className="text-muted-foreground flex items-start gap-2">
                                <Building2 className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                  {request.source.street}
                                  {request.source.building && `, ${request.source.building}`}
                                  {request.source.governorate && `, ${request.source.governorate}`}
                                </span>
                              </p>
                            )}
                            {request.source.mobile && (
                              <p className="text-muted-foreground flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{request.source.mobile}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery Location */}
                  {mapView === "delivery" && (
                    <div className="relative">
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-sm">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-base font-semibold text-blue-700 dark:text-blue-300">
                              {t.companyRequestDetail.deliveryDestination}
                            </h4>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300">
                              {request.destinationPickupMode === "Self" ? t.companyRequestDetail.selfDelivery : t.companyRequestDetail.companyDelivery}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <p className="font-medium text-foreground">
                              {request.destination.city}, {request.destination.country}
                            </p>
                            {request.destination.street && (
                              <p className="text-muted-foreground flex items-start gap-2">
                                <Building2 className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                  {request.destination.street}
                                  {request.destination.building && `, ${request.destination.building}`}
                                  {request.destination.governorate && `, ${request.destination.governorate}`}
                                </span>
                              </p>
                            )}
                            {request.destination.mobile && (
                              <p className="text-muted-foreground flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{request.destination.mobile}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Map Display */}
                  {(request.source.coordinates || request.destination.coordinates) && (
                    <div className={`rounded-lg overflow-hidden border-2 transition-colors ${
                      mapView === "pickup" 
                        ? "border-green-400 dark:border-green-600" 
                        : "border-blue-400 dark:border-blue-600"
                    }`}>
                      {((mapView === "pickup" && request.source.coordinates) ||
                        (mapView === "delivery" && request.destination.coordinates)) ? (
                        <div className="h-64">
                          <SimpleLocationMap
                            key={mapView}
                            position={
                              mapView === "pickup"
                                ? [request.source.coordinates!.latitude, request.source.coordinates!.longitude]
                                : [request.destination.coordinates!.latitude, request.destination.coordinates!.longitude]
                            }
                            label={
                              mapView === "pickup"
                                ? `${t.companyRequestDetail.pickup}: ${request.source.city}`
                                : `${t.companyRequestDetail.delivery}: ${request.destination.city}`
                            }
                          />
                        </div>
                      ) : (
                        <div className="h-48 bg-muted flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t.companyRequestDetail.mapUnavailable}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Items Section */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    {t.companyRequestDetail.shipmentItems}
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="secondary" className="font-medium">
                      <Box className="w-3.5 h-3.5 mr-1.5" /> 
                      {totalQuantity} {t.company.units}
                    </Badge>
                    <Badge variant="secondary" className="font-medium">
                      <Scale className="w-3.5 h-3.5 mr-1.5" /> 
                      {totalWeight.toFixed(1)} kg
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {request.items
                    .slice(0, expandedItems ? undefined : 3)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/20 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span className="text-base font-semibold text-foreground">
                                {item.quantity}x {item.item || item.name}
                              </span>
                              {item.category && (
                                <Badge variant="outline" className="text-xs font-medium">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Scale className="w-3.5 h-3.5" /> 
                                <span className="font-medium">{item.weight} kg</span>
                              </span>
                              {item.dimensions && (
                                <span className="flex items-center gap-1.5">
                                  <Ruler className="w-3.5 h-3.5" /> 
                                  <span className="font-medium">{item.dimensions}</span>
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <div className="mt-3 p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  <span>{item.note}</span>
                                </p>
                              </div>
                            )}
                            {item.services && (
                              <div className="flex gap-2 mt-3">
                                {item.services.canBeAssembledDisassembled && (
                                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs">
                                    {t.companyRequestDetail.assemblyDisassembly}
                                  </Badge>
                                )}
                                {item.services.packaging && (
                                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs">
                                    {t.companyRequestDetail.packaging}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Item Media */}
                          {item.media && item.media.length > 0 && (
                            <div className="flex gap-2 shrink-0">
                              {item.media.slice(0, 2).map((media, mediaIdx) => (
                                <button
                                  key={mediaIdx}
                                  onClick={() => {
                                    setSelectedImage(media.url);
                                    setShowImageModal(true);
                                  }}
                                  className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                                >
                                  <img
                                    src={media.url}
                                    alt={`Item ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                              {item.media.length > 2 && (
                                <div className="w-16 h-16 rounded-lg bg-muted border-2 border-border flex items-center justify-center">
                                  <span className="text-sm font-semibold text-muted-foreground">
                                    +{item.media.length - 2}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {request.items.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedItems(!expandedItems)}
                    className="w-full mt-3"
                  >
                    {expandedItems ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        {t.common.showLess}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        {t.companyRequestDetail.showAllItems} ({request.items.length})
                      </>
                    )}
                  </Button>
                )}
              </Card>

              {/* Delivery Details */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-5 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  {t.companyRequestDetail.deliveryInformation}
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1.5 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        {t.companyRequestDetail.deliveryType}
                      </p>
                      <p className="text-base font-semibold text-foreground">{request.deliveryType}</p>
                    </div>
                    {request.startTime && (
                      <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 border border-purple-200 dark:border-purple-800">
                        <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1.5 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Preferred Time
                        </p>
                        <p className="text-base font-semibold text-foreground">{request.startTime}</p>
                      </div>
                    )}
                  </div>
                  
                  {request.availableDays && request.availableDays.length > 0 && (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 border border-amber-200 dark:border-amber-800">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2.5 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {t.companyRequestDetail.availableDays}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {request.availableDays.includes("All Week") ? (
                          <Badge className="bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 border-0">
                            {t.common.allWeek}
                          </Badge>
                        ) : (
                          request.availableDays.map((day) => (
                            <Badge 
                              key={day} 
                              className="bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100 border-0"
                            >
                              {day}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {request.comment && (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/20 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {t.companyRequestDetail.additionalNotes}
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {request.comment}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column - Actions */}
            <div className="space-y-6">
              {/* My Offers */}
              {myOffers.length > 0 && (
                <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-300 dark:border-blue-700">
                  <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {t.companyRequestDetail.yourActiveOffer}{myOffers.length > 1 ? "s" : ""}
                  </h3>
                  <div className="space-y-3">
                    {myOffers.map((offer, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900/60 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t.companyRequestDetail.yourBid}</p>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              ${offer.cost.toFixed(2)}
                            </span>
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
                            {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                          </Badge>
                        </div>
                        {offer.comment && (
                          <div className="mt-3 p-2.5 bg-blue-50/50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-900 dark:text-blue-100 italic">
                              "{offer.comment}"
                            </p>
                          </div>
                        )}
                        {offer.createdAt && (
                          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(offer.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Other Offers */}
              {request.costOffers &&
                request.costOffers.filter((o) => o.company.id !== user?.id).length > 0 && (
                  <Card className="p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/40 dark:to-slate-900/20 border-slate-200 dark:border-slate-700">
                    <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      {t.companyRequestDetail.competingOffers} ({request.costOffers.filter((o) => o.company.id !== user?.id).length})
                    </h3>
                    <div className="space-y-2.5">
                      {request.costOffers
                        .filter((o) => o.company.id !== user?.id)
                        .map((offer, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-slate-900/40 rounded-lg p-3.5 border border-border hover:border-primary/50 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-foreground text-sm mb-1">
                                  {offer.company.name}
                                </p>
                                <p className="text-xl font-bold text-primary">
                                  ${offer.cost.toFixed(2)}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  offer.status === "accepted"
                                    ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30"
                                    : offer.status === "rejected"
                                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30"
                                      : "border-border"
                                }
                              >
                                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}

              {/* Offer Form */}
              <Card className="p-5 sticky top-6 z-10">
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    {myOffers.length > 0 ? t.companyRequestDetail.updateYourOffer : t.companyRequestDetail.submitAnOffer}
                  </h3>

                  {/* Estimated Cost Display */}
                  {request.primaryCost && (
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">{t.companyRequestDetail.clientEstimatedCost}</p>
                          <p className="text-2xl font-bold text-primary">
                            ${parseFloat(request.primaryCost).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          <p>{t.companyRequestDetail.baseYourOffer}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!showOfferForm ? (
                    <div className="space-y-2">
                      <Button
                        onClick={() => setShowOfferForm(true)}
                        className="w-full gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        {myOffers.length > 0 ? t.companyRequestDetail.updateOffer : t.companyRequestDetail.makeAnOffer}
                      </Button>
                      {myOffers.length === 0 && (
                        <Button
                          onClick={handleRejectRequest}
                          variant="outline"
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                          disabled={isSubmitting}
                        >
                          <XCircle className="w-4 h-4" />
                          {t.companyRequestDetail.notInterested}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t.companyRequestDetail.yourPrice} <span className="text-destructive">*</span>
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            type="number"
                            placeholder="0.00"
                            value={offerCost}
                            onChange={(e) => setOfferCost(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 text-lg font-semibold border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            min="0"
                            step="0.01"
                            autoFocus
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t.companyRequestDetail.commentOptional}
                        </label>
                        <textarea
                          placeholder={t.companyRequestDetail.offerPlaceholder}
                          value={offerComment}
                          onChange={(e) => setOfferComment(e.target.value)}
                          className="w-full px-4 py-2.5 border border-border rounded-lg bg-background resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
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
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>

        {/* Image Modal */}
        {showImageModal && selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
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
