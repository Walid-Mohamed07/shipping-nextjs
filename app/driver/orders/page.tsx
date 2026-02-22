"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Header } from "@/app/components/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { MapPin, Package, User, Truck, Calendar } from "lucide-react";
import { RequestCardSkeleton } from "@/app/components/loaders";

// Helper function to format address objects
const formatAddress = (address: any): string => {
  if (!address) return "N/A";
  if (typeof address === "string") return address;

  const parts = [];
  if (address.building) parts.push(address.building);
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.country) parts.push(address.country);

  return parts.filter(Boolean).join(", ") || "N/A";
};

interface Assignment {
  id: string;
  requestId: string;
  driverId: string;
  vehicleId: string;
  status: string;
  assignedAt: string;
  estimatedDelivery: string;
  request: {
    id: string;
    from: string;
    to: string;
    item: string;
    category: string;
    estimatedTime: string;
  };
  vehicle: {
    id: string;
    name: string;
    type: string;
    plateNumber: string;
  };
  clientName: string;
  clientEmail: string;
}

export default function DriverOrders() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "driver")) {
      router.push("/");
      return;
    }

    if (user && user.id && orders.length === 0) {
      const fetchOrders = async () => {
        try {
          const response = await fetch(
            `/api/driver/orders?driverId=${user.id}`,
          );
          const data = await response.json();
          setOrders(data.orders);
        } catch (error) {
          console.error("Failed to fetch orders:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchOrders();
    }
  }, [user, isLoading]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 space-y-2">
            <div className="h-10 w-1/3 bg-skeleton rounded animate-pulse" />
            <div className="h-6 w-1/2 bg-skeleton rounded animate-pulse" />
          </div>
          <RequestCardSkeleton count={3} />
        </main>
      </div>
    );
  }

  if (!user || user.role !== "driver") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            My Assignments
          </h1>
          <p className="text-muted-foreground">
            View and manage your assigned shipments
          </p>
        </div>

        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No Assignments Yet
            </h2>
            <p className="text-muted-foreground">
              You don't have any assigned orders at the moment
            </p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => {
              // Add safety checks for nested properties
              if (!order || !order.request || !order.vehicle) {
                return null;
              }

              return (
                <Card
                  key={order.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1">
                          {order.request.id}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Assignment ID: {order.id}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                        {order.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Route Information */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">
                          Route Details
                        </h4>
                        <div className="flex gap-2">
                          <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              From
                            </p>
                            <p className="font-medium text-foreground">
                              {formatAddress(order.request.from)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">To</p>
                            <p className="font-medium text-foreground">
                              {formatAddress(order.request.to)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Package Information */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">
                          Package Details
                        </h4>
                        <div className="flex gap-2">
                          <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Item
                            </p>
                            <p className="font-medium text-foreground">
                              {order.request.item}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Category
                            </p>
                            <p className="font-medium text-foreground">
                              {order.request.category}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Client & Vehicle Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-border">
                      <div>
                        <div className="flex gap-2 items-start">
                          <User className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Client
                            </p>
                            <p className="font-medium text-foreground text-sm">
                              {order.clientName || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.clientEmail || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex gap-2 items-start">
                          <Truck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Vehicle
                            </p>
                            <p className="font-medium text-foreground text-sm">
                              {order.vehicle?.name || "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.vehicle?.plateNumber || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex gap-2 items-start">
                          <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Est. Delivery
                            </p>
                            <p className="font-medium text-foreground text-sm">
                              {order.estimatedDelivery
                                ? new Date(
                                    order.estimatedDelivery,
                                  ).toLocaleDateString()
                                : "N/A"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {order.estimatedDelivery
                                ? new Date(
                                    order.estimatedDelivery,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
