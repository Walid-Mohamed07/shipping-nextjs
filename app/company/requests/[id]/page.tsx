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
  User as UserIcon,
  Calendar,
  Clock,
  Truck,
  Box,
  Phone,
  Mail,
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
  Image as ImageIcon,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Request, CostOffer } from "@/types";
import Link from "next/link";
import dynamic from "next/dynamic";

// Dynamically import map component
const SimpleLocationMap = dynamic(
  () =>
    import("@/app/components/SimpleLocationMap").then(
      (mod) => mod.SimpleLocationMap,
    ),
  {
    ssr: false,
    loading: () => <div className="h-75 bg-muted animate-pulse rounded-lg" />,
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
  const [mapView, setMapView] = useState<"source" | "destination">("source");

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
        toast.info("Another company submitted an offer", {
          description: "The competition is on!",
        });
      } else if (event.type === "OFFER_ACCEPTED") {
        if (event.payload.companyId === user?.id) {
          toast.success("Your offer was accepted!", {
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
      }
    } catch (error) {
      console.error("Failed to fetch company info:", error);
    }
  }, [user?.id]);

  // Data fetching for request is now handled by useLiveRequest hook

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
      showError("Please enter a cost amount");
      return;
    }

    const cost = parseFloat(offerCost);
    if (isNaN(cost) || cost <= 0) {
      showError("Please enter a valid cost amount");
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
            ? "Offer updated successfully!"
            : "Offer submitted successfully! The client will review your offer.",
        );
        setOfferCost("");
        setOfferComment("");
        setShowOfferForm(false);
        // Refresh will happen automatically via real-time updates
        // But also trigger manual refresh for immediate feedback
        await refreshRequest();
      } else {
        const errorData = await response.json();
        showError(errorData.error || "Failed to submit offer");
      }
    } catch (error) {
      console.error("Failed to submit offer:", error);
      showError("Failed to submit offer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequest = async () => {
    if (
      !confirm(
        "Are you sure you want to reject this request? You won't see it again.",
      )
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

  if (!request) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Request not found</p>
        <Link href="/company/requests">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
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
        <main className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/company/requests">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {request.publicId}
                </h1>
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
              <div>
                Created: {new Date(request.createdAt!).toLocaleDateString()}
              </div>
              <div>
                Updated: {new Date(request.updatedAt!).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Location Map with Toggle */}
              {request.source.coordinates &&
                request.destination.coordinates && (
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Location Map
                      </h3>
                      <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                        <Button
                          variant={mapView === "source" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setMapView("source")}
                          className="h-8 px-3 text-xs"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Pickup
                        </Button>
                        <Button
                          variant={
                            mapView === "destination" ? "default" : "ghost"
                          }
                          size="sm"
                          onClick={() => setMapView("destination")}
                          className="h-8 px-3 text-xs"
                        >
                          <MapPin className="w-3 h-3 mr-1" />
                          Delivery
                        </Button>
                      </div>
                    </div>
                    <div className="h-75 rounded-lg overflow-hidden border border-border">
                      {mapView === "source" ? (
                        <SimpleLocationMap
                          key="source-map"
                          position={[
                            request.source.coordinates.latitude,
                            request.source.coordinates.longitude,
                          ]}
                          label={`Pickup: ${request.source.city}, ${request.source.country}`}
                        />
                      ) : (
                        <SimpleLocationMap
                          key="destination-map"
                          position={[
                            request.destination.coordinates.latitude,
                            request.destination.coordinates.longitude,
                          ]}
                          label={`Delivery: ${request.destination.city}, ${request.destination.country}`}
                        />
                      )}
                    </div>
                    <div className="mt-3 p-2 bg-muted/50 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        {mapView === "source" ? (
                          <>
                            <span className="font-semibold text-foreground">
                              Pickup Location:{" "}
                            </span>
                            {request.source.street &&
                              `${request.source.street}, `}
                            {request.source.city},{" "}
                            {request.source.governorate &&
                              `${request.source.governorate}, `}
                            {request.source.country}
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-foreground">
                              Delivery Location:{" "}
                            </span>
                            {request.destination.street &&
                              `${request.destination.street}, `}
                            {request.destination.city},{" "}
                            {request.destination.governorate &&
                              `${request.destination.governorate}, `}
                            {request.destination.country}
                          </>
                        )}
                      </p>
                    </div>
                  </Card>
                )}

              {/* Locations */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Shipping Route
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-green-800 dark:text-green-200">
                        Pickup Location
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-foreground">
                        {request.source.fullName}
                      </p>
                      <p className="text-muted-foreground">
                        {request.source.street}, {request.source.building}
                      </p>
                      <p className="text-muted-foreground">
                        {request.source.city}, {request.source.governorate}
                      </p>
                      <p className="text-muted-foreground">
                        {request.source.country}
                      </p>
                      {request.source.mobile && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {request.source.mobile}
                        </p>
                      )}
                      <Badge className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                        {request.sourcePickupMode === "Self"
                          ? "Self Pickup"
                          : "Company Pickup"}
                      </Badge>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-red-800 dark:text-red-200">
                        Delivery Location
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-foreground">
                        {request.destination.fullName}
                      </p>
                      <p className="text-muted-foreground">
                        {request.destination.street},{" "}
                        {request.destination.building}
                      </p>
                      <p className="text-muted-foreground">
                        {request.destination.city},{" "}
                        {request.destination.governorate}
                      </p>
                      <p className="text-muted-foreground">
                        {request.destination.country}
                      </p>
                      {request.destination.mobile && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />{" "}
                          {request.destination.mobile}
                        </p>
                      )}
                      <Badge className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                        {request.destinationPickupMode === "Self"
                          ? "Self Delivery"
                          : "Company Delivery"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Items Section */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Items ({request.items.length})
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Box className="w-4 h-4" /> {totalQuantity} units
                    </span>
                    <span className="flex items-center gap-1">
                      <Scale className="w-4 h-4" /> {totalWeight.toFixed(1)} kg
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {request.items
                    .slice(0, expandedItems ? undefined : 3)
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-4 border border-border"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {item.quantity}x {item.item || item.name}
                              </span>
                              {item.category && (
                                <Badge variant="outline" className="text-xs">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Scale className="w-3 h-3" /> {item.weight} kg
                              </span>
                              {item.dimensions && (
                                <span className="flex items-center gap-1">
                                  <Ruler className="w-3 h-3" />{" "}
                                  {item.dimensions}
                                </span>
                              )}
                            </div>
                            {item.note && (
                              <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 flex items-start gap-1">
                                <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                                {item.note}
                              </p>
                            )}
                            {/* Services */}
                            {item.services && (
                              <div className="flex gap-2 mt-2">
                                {item.services.canBeAssembledDisassembled && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Assembly/Disassembly
                                  </Badge>
                                )}
                                {item.services.packaging && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Packaging
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Item Media */}
                          {item.media && item.media.length > 0 && (
                            <div className="flex gap-2">
                              {item.media.slice(0, 2).map((media, mediaIdx) => (
                                <button
                                  key={mediaIdx}
                                  onClick={() => {
                                    setSelectedImage(media.url);
                                    setShowImageModal(true);
                                  }}
                                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                                >
                                  <img
                                    src={media.url}
                                    alt={`Item ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                              {item.media.length > 2 && (
                                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-sm font-medium">
                                  +{item.media.length - 2}
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
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Show All {request.items.length} Items
                      </>
                    )}
                  </Button>
                )}
              </Card>

              {/* Delivery Details */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  Delivery Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">
                      Delivery Type
                    </p>
                    <p className="font-medium">{request.deliveryType}</p>
                  </div>
                  {request.startTime && (
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        Preferred Time
                      </p>
                      <p className="font-medium">{request.startTime}</p>
                    </div>
                  )}
                  {request.primaryCost && (
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">
                        Primary Cost
                      </p>
                      <p className="font-medium text-primary">
                        ${request.primaryCost}
                      </p>
                    </div>
                  )}
                  {request.availableDays &&
                    request.availableDays.length > 0 && (
                      <div className="bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg md:col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">
                          Available Days
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {request.availableDays.includes("All Week") ? (
                            <Badge variant="secondary">All Week</Badge>
                          ) : (
                            request.availableDays.map((day) => (
                              <Badge key={day} variant="secondary">
                                {day.slice(0, 3)}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                </div>
                {request.comment && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Additional Notes
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {request.comment}
                    </p>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column - Client & Actions */}
            <div className="space-y-6">
              {/* Client Info */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-primary" />
                  Client Information
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={
                      typeof request.user === "object" &&
                      request.user?.profilePicture
                        ? request.user.profilePicture
                        : "/default-avatar.png"
                    }
                    alt="Client"
                    className="w-14 h-14 rounded-full object-cover border border-border"
                  />
                  <div>
                    <p className="font-semibold text-foreground">
                      {typeof request.user === "object"
                        ? request.user?.fullName
                        : "Unknown"}
                    </p>
                    {typeof request.user === "object" &&
                      request.user?.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {request.user.email}
                        </p>
                      )}
                    {typeof request.user === "object" &&
                      request.user?.mobile && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {request.user.mobile}
                        </p>
                      )}
                  </div>
                </div>
              </Card>

              {/* My Offers */}
              {myOffers.length > 0 && (
                <Card className="p-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Your Offer{myOffers.length > 1 ? "s" : ""}
                  </h3>
                  <div className="space-y-3">
                    {myOffers.map((offer, idx) => (
                      <div
                        key={idx}
                        className="bg-white dark:bg-slate-900/40 rounded-lg p-3 border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            ${offer.cost.toFixed(2)}
                          </span>
                          <Badge
                            className={
                              offer.status === "accepted"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                                : offer.status === "rejected"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                            }
                          >
                            {offer.status === "accepted" && (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                            )}
                            {offer.status === "rejected" && (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            {offer.status}
                          </Badge>
                        </div>
                        {offer.comment && (
                          <p className="text-sm text-blue-600/80 dark:text-blue-300/80 italic">
                            "{offer.comment}"
                          </p>
                        )}
                        {offer.createdAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Submitted:{" "}
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
                request.costOffers.filter((o) => o.company.id !== user?.id)
                  .length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      Other Company Offers (
                      {
                        request.costOffers.filter(
                          (o) => o.company.id !== user?.id,
                        ).length
                      }
                      )
                    </h3>
                    <div className="space-y-2">
                      {request.costOffers
                        .filter((o) => o.company.id !== user?.id)
                        .map((offer, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 border border-border"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-foreground">
                                  {offer.company.name}
                                </p>
                                <p className="text-lg font-bold text-primary">
                                  ${offer.cost.toFixed(2)}
                                </p>
                              </div>
                              <Badge
                                className={
                                  offer.status === "accepted"
                                    ? "bg-green-100 text-green-800"
                                    : offer.status === "rejected"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {offer.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}

              {/* Offer Form */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  {myOffers.length > 0
                    ? "Update Your Offer"
                    : "Submit an Offer"}
                </h3>

                {!showOfferForm ? (
                  <div className="space-y-3">
                    <Button
                      onClick={() => setShowOfferForm(true)}
                      className="w-full gap-2"
                    >
                      <DollarSign className="w-4 h-4" />
                      {myOffers.length > 0 ? "Update Offer" : "Make an Offer"}
                    </Button>
                    {myOffers.length === 0 && (
                      <Button
                        onClick={handleRejectRequest}
                        variant="outline"
                        className="w-full text-destructive hover:text-destructive gap-2"
                        disabled={isSubmitting}
                      >
                        <XCircle className="w-4 h-4" />
                        Reject Request
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Your Price ($){" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="number"
                          placeholder="0.00"
                          value={offerCost}
                          onChange={(e) => setOfferCost(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 text-lg border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          min="0"
                          step="0.01"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Comment (optional)
                      </label>
                      <textarea
                        placeholder="Add details about your offer, delivery timeline, or special conditions..."
                        value={offerComment}
                        onChange={(e) => setOfferComment(e.target.value)}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitOffer}
                        className="flex-1 gap-2"
                        disabled={isSubmitting || !offerCost}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Submit Offer
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
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
