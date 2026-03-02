"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Check, X, Eye, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Request, User } from "@/types";
import { useLiveData, useLiveEvent } from "@/app/hooks/useLiveData";
import { toast } from "sonner";
import Link from "next/link";
import { useTranslation } from "@/app/context/LocaleContext";

interface Order extends Request {
  user?: User;
  userName?: string;
  userEmail?: string;
}

interface AdminOrdersTabProps {
  onOrderAccepted?: (orderId: string) => void;
}

export function AdminOrdersTab({ onOrderAccepted }: AdminOrdersTabProps) {
  const { t } = useTranslation();
  // Use live data hook for real-time updates
  const { 
    data: liveOrders, 
    isLoading: loading, 
    refresh,
    isConnected 
  } = useLiveData<Order[]>({
    endpoint: "/api/admin/requests",
    eventTypes: [
      "REQUEST_CREATED",
      "REQUEST_UPDATED",
      "OFFER_SUBMITTED",
      "OFFER_ACCEPTED",
      "STATUS_CHANGED",
    ],
    transform: (data) => data.requests || [],
  });
  
  const [orders, setOrders] = useState<Order[]>([]);

  // Update local state when live data changes
  useEffect(() => {
    if (liveOrders) {
      setOrders(liveOrders);
    }
  }, [liveOrders]);

  // Show toast notifications for real-time events
  useLiveEvent(
    ["REQUEST_CREATED", "STATUS_CHANGED"],
    (event) => {
      if (event.type === "REQUEST_CREATED") {
        toast.info(t.adminOrders.newOrderReceived, {
          description: t.adminOrders.newOrderDesc,
        });
      }
    }
  );

  const handleAccept = async (orderId: string) => {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: orderId, requestStatus: "Accepted" }),
      });

      if (response.ok) {
        setOrders(
          orders.map((o) =>
            o.id === orderId ? { ...o, requestStatus: "Accepted" } : o,
          ),
        );
        onOrderAccepted?.(orderId);
        // Real-time will handle refresh automatically
        await refresh();
      }
    } catch (error) {
      console.error("Failed to accept order:", error);
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: orderId, requestStatus: "Rejected" }),
      });

      if (response.ok) {
        setOrders(
          orders.map((o) =>
            o.id === orderId ? { ...o, requestStatus: "Rejected" } : o,
          ),
        );
        // Real-time will handle refresh automatically
        await refresh();
      }
    } catch (error) {
      console.error("Failed to reject order:", error);
    }
  };

  if (loading) {
    return <div className="p-4">{t.adminOrders.loading}</div>;
  }

  const pendingOrders = orders.filter((o) => o.requestStatus === "Pending");

  const getAvatarInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">
          {t.adminOrders.pendingOrders} ({pendingOrders.length})
        </h3>
      </div>

      {pendingOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">{t.adminOrders.noPendingOrders}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingOrders.map((order) => {
            const user = order.user || {
              id: order.userId,
              fullName: order.userName || "Unknown",
              email: order.userEmail || "-",
              profilePicture: null,
            };
            const firstItem =
              order.items && order.items.length ? order.items[0] : null;
            const itemName = firstItem
              ? (firstItem.item ?? firstItem.name ?? "-")
              : "-";
            const category = firstItem ? firstItem.category : "-";
            const weight = firstItem ? firstItem.weight : null;
            const quantity = firstItem ? firstItem.quantity : null;

            return (
              <Card key={order.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    {/* Client Info with Avatar */}
                    <div className="flex items-center gap-3 mb-3">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-700 dark:text-gray-300"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-foreground">
                          {user.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Request ID and Status */}
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-semibold text-foreground text-sm">
                        {order.id}
                      </h4>
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                        {t.adminOrders.pending}
                      </span>
                    </div>

                    {/* Route and Item Info */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">{t.adminOrders.from}</span>{" "}
                        <span className="font-medium">
                          {order.source?.city ?? "-"},{" "}
                          {order.source?.country ?? "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t.adminOrders.to}</span>{" "}
                        <span className="font-medium">
                          {order.destination?.city ?? "-"},{" "}
                          {order.destination?.country ?? "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t.adminOrders.item}</span>{" "}
                        <span className="font-medium">{itemName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t.adminOrders.category}</span>{" "}
                        <span className="font-medium">{category}</span>
                      </div>
                      {weight && (
                        <div>
                          <span className="text-muted-foreground">{t.adminOrders.weight}</span>{" "}
                          <span className="font-medium">{weight} kg</span>
                        </div>
                      )}
                      {quantity != null && (
                        <div>
                          <span className="text-muted-foreground">
                            {t.adminOrders.quantity}
                          </span>{" "}
                          <span className="font-medium">{quantity}</span>
                        </div>
                      )}
                      {order.availableDays && order.availableDays.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">{t.adminOrders.availableDays}</span>{" "}
                          {order.availableDays.includes("All Week") ? (
                            <span className="inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {t.adminOrders.allWeek}
                            </span>
                          ) : (
                            <span className="inline-flex flex-wrap gap-1">
                              {order.availableDays.map((day: string) => (
                                <span
                                  key={day}
                                  className="inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                >
                                  {day.slice(0, 3)}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(order.id!)}
                      className="gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {t.adminOrders.accept}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(order.id!)}
                      className="gap-2 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      {t.adminOrders.reject}
                    </Button>
                    <Link href={`/admin/request/${order.publicId}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 cursor-pointer w-full"
                      >
                        <Eye className="w-4 h-4" />
                        {t.adminOrders.details}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">{t.adminOrders.allOrders}</h3>
        <div className="space-y-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 border border-border rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium">{order.id}</p>
                <p className="text-sm text-muted-foreground">
                  {order.source?.city ?? "-"}, {order.source?.country ?? "-"} →{" "}
                  {order.destination?.city ?? "-"},{" "}
                  {order.destination?.country ?? "-"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    order.requestStatus === "Accepted"
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : order.requestStatus === "Rejected"
                        ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                  }`}
                >
                  {order.requestStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
