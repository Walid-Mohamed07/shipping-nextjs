"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Check, X } from "lucide-react";

interface Address {
  country: string;
  countryCode?: string;
  fullName: string;
  mobile: string;
  street: string;
  building?: string;
  city: string;
  district?: string;
  governorate?: string;
  postalCode: string;
  landmark?: string;
  addressType: string;
  deliveryInstructions?: string;
  primary?: boolean;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  from: Address;
  to: Address;
  item: string;
  category: string;
  dimensions?: string;
  weight?: string;
  quantity?: number;
  estimatedTime: string;
  estimatedCost?: string;
  orderStatus: "Pending" | "Accepted" | "Rejected";
  deliveryStatus: string;
  sourceAddress?: string;
  address?: string;
}

interface AdminOrdersTabProps {
  onOrderAccepted: (orderId: string) => void;
}

export function AdminOrdersTab({ onOrderAccepted }: AdminOrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("/api/admin/orders");
        const data = await response.json();
        setOrders(data.requests);
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
        body: JSON.stringify({ requestId: orderId, orderStatus: "Accepted" }),
      });

      if (response.ok) {
        setOrders(
          orders.map((o) =>
            o.id === orderId ? { ...o, orderStatus: "Accepted" } : o,
          ),
        );
        onOrderAccepted(orderId);
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
        body: JSON.stringify({ requestId: orderId, orderStatus: "Rejected" }),
      });

      if (response.ok) {
        setOrders(
          orders.map((o) =>
            o.id === orderId ? { ...o, orderStatus: "Rejected" } : o,
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

  const pendingOrders = orders.filter((o) => o.orderStatus === "Pending");

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
          {pendingOrders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-foreground">
                      {order.id}
                    </h4>
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Client:{" "}
                    <span className="font-medium">{order.userName}</span> (
                    {order.userEmail})
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">From:</span>{" "}
                      <span className="font-medium">{order.from.city}, {order.from.country}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To:</span>{" "}
                      <span className="font-medium">{order.to.city}, {order.to.country}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Item:</span>{" "}
                      <span className="font-medium">{order.item}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category:</span>{" "}
                      <span className="font-medium">{order.category}</span>
                    </div>
                    {order.weight && (
                      <div>
                        <span className="text-muted-foreground">Weight:</span>{" "}
                        <span className="font-medium">{order.weight} kg</span>
                      </div>
                    )}
                    {order.quantity && (
                      <div>
                        <span className="text-muted-foreground">Quantity:</span>{" "}
                        <span className="font-medium">{order.quantity}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(order.id)}
                    className="gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(order.id)}
                    className="gap-2 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
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
                  {order.from.city}, {order.from.country} → {order.to.city}, {order.to.country}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    order.orderStatus === "Accepted"
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : order.orderStatus === "Rejected"
                        ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                  }`}
                >
                  {order.orderStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
