"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Check, X, Eye } from "lucide-react";
import { Request, User } from "@/types";
import Link from "next/link";

interface Order extends Request {
  user?: User;
  userName?: string;
  userEmail?: string;
}

interface AdminOrdersTabProps {
  onOrderAccepted?: (orderId: string) => void;
}

export function AdminOrdersTab({ onOrderAccepted }: AdminOrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/admin/requests");
        const data = await response.json();
        setOrders(data.requests || []);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

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
      }
    } catch (error) {
      console.error("Failed to reject order:", error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading orders...</div>;
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
          Pending Orders ({pendingOrders.length})
        </h3>
      </div>

      {pendingOrders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No pending orders</p>
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
                        Pending
                      </span>
                    </div>

                    {/* Route and Item Info */}
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">From:</span>{" "}
                        <span className="font-medium">
                          {order.source?.city ?? "-"},{" "}
                          {order.source?.country ?? "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">To:</span>{" "}
                        <span className="font-medium">
                          {order.destination?.city ?? "-"},{" "}
                          {order.destination?.country ?? "-"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Item:</span>{" "}
                        <span className="font-medium">{itemName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Category:</span>{" "}
                        <span className="font-medium">{category}</span>
                      </div>
                      {weight && (
                        <div>
                          <span className="text-muted-foreground">Weight:</span>{" "}
                          <span className="font-medium">{weight} kg</span>
                        </div>
                      )}
                      {quantity != null && (
                        <div>
                          <span className="text-muted-foreground">
                            Quantity:
                          </span>{" "}
                          <span className="font-medium">{quantity}</span>
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
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(order.id!)}
                      className="gap-2 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </Button>
                    <Link href={`/admin/request/${order.id}`}>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 cursor-pointer w-full"
                      >
                        <Eye className="w-4 h-4" />
                        Details
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
        <h3 className="text-lg font-semibold mb-4">All Orders</h3>
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
