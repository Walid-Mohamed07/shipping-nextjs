"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, TrendingUp, Package, Truck, Clock } from "lucide-react";

interface Metrics {
  totalShipments: number;
  deliveredShipments: number;
  inTransitShipments: number;
  averageDeliveryTime: string;
  onTimeDeliveryRate: number;
  vehicleUtilization: number;
  driverPerformance: Array<{
    driverId: string;
    name: string;
    completedDeliveries: number;
    onTimeRate: number;
  }>;
}

export function AdminPerformanceMetricsTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      // Simulate metric calculation
      const metricsData: Metrics = {
        totalShipments: 15,
        deliveredShipments: 9,
        inTransitShipments: 4,
        averageDeliveryTime: "6.2 days",
        onTimeDeliveryRate: 87,
        vehicleUtilization: 72,
        driverPerformance: [
          {
            driverId: "driver-001",
            name: "Mike Johnson",
            completedDeliveries: 8,
            onTimeRate: 92,
          },
          {
            driverId: "driver-002",
            name: "Sarah Williams",
            completedDeliveries: 6,
            onTimeRate: 85,
          },
          {
            driverId: "driver-003",
            name: "Marcus Schmidt",
            completedDeliveries: 5,
            onTimeRate: 80,
          },
        ],
      };
      setMetrics(metricsData);
      setError("");
    } catch (err) {
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading metrics...</p>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400 p-4 rounded-lg border border-red-200 dark:border-red-800">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        {error}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Delivery Performance Metrics
        </h2>
        <p className="text-muted-foreground mt-1">
          Track key performance indicators and delivery efficiency
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Total Shipments
              </p>
              <p className="text-4xl font-bold text-foreground mt-2">
                {metrics.totalShipments}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-600 dark:text-blue-400 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Delivered
              </p>
              <p className="text-4xl font-bold text-green-700 dark:text-green-400 mt-2">
                {metrics.deliveredShipments}
              </p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                {Math.round(
                  (metrics.deliveredShipments / metrics.totalShipments) * 100,
                )}
                % complete
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                In Transit
              </p>
              <p className="text-4xl font-bold text-purple-700 dark:text-purple-400 mt-2">
                {metrics.inTransitShipments}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">
                Currently moving
              </p>
            </div>
            <Truck className="w-8 h-8 text-purple-600 dark:text-purple-400 opacity-20" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Avg Delivery Time
              </p>
              <p className="text-3xl font-bold text-orange-700 dark:text-orange-400 mt-2">
                {metrics.averageDeliveryTime}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Performance Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">
            On-Time Delivery Rate
          </h3>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {metrics.onTimeDeliveryRate}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Target: 95%
                </p>
              </div>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${metrics.onTimeDeliveryRate}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">
            Vehicle Utilization
          </h3>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {metrics.vehicleUtilization}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Fleet capacity usage
                </p>
              </div>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${metrics.vehicleUtilization}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Driver Performance */}
      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">
          Driver Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Driver
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Completed Deliveries
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  On-Time Rate
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.driverPerformance.map((driver) => (
                <tr
                  key={driver.driverId}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-foreground">
                    {driver.name}
                  </td>
                  <td className="py-3 px-4 text-foreground">
                    {driver.completedDeliveries}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            driver.onTimeRate >= 90
                              ? "bg-green-500"
                              : driver.onTimeRate >= 80
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${driver.onTimeRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {driver.onTimeRate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        driver.onTimeRate >= 85
                          ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                          : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400"
                      }`}
                    >
                      {driver.onTimeRate >= 85 ? "Excellent" : "Good"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
