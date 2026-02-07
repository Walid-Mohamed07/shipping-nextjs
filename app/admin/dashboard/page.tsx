"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Header } from "@/app/components/Header";
import { AdminRequestsTab } from "@/app/components/AdminRequestsTab";
import { AdminAssignmentTab } from "@/app/components/AdminAssignmentTab";
import { WarehouseManagementTab } from "@/app/components/AdminWarehouseManagementTab";
import { AdminVehicleRulesTab } from "@/app/components/AdminVehicleRulesTab";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { AdminVehicleManagementTab } from "@/app/components/AdminVehicleManagementTab";
import { AdminShipmentsMapTab } from "@/app/components/AdminShipmentsMapTab";
import { AdminOverrideAssignmentsTab } from "@/app/components/AdminOverrideAssignmentsTab";
import { AdminPerformanceMetricsTab } from "@/app/components/AdminPerformanceMetricsTab";
import { AdminAuditLogsTab } from "@/app/components/AdminAuditLogsTab";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    | "warehouses"
    | "requests"
    | "assignments"
    | "vehicle-rules"
    | "vehicles"
    | "map"
    | "override"
    | "metrics"
    | "audit"
  >("requests");
  const [acceptedOrderIds, setAcceptedOrderIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage shipping requests and assignments
          </p>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            onClick={() => setActiveTab("warehouses")}
            variant={activeTab === "warehouses" ? "default" : "outline"}
            className={activeTab === "warehouses" ? "" : "bg-transparent"}
            size="sm"
          >
            Warehouses
          </Button>
          <Button
            onClick={() => setActiveTab("requests")}
            variant={activeTab === "requests" ? "default" : "outline"}
            className={activeTab === "requests" ? "" : "bg-transparent"}
            size="sm"
          >
            Requests
          </Button>
          <Button
            onClick={() => setActiveTab("assignments")}
            variant={activeTab === "assignments" ? "default" : "outline"}
            className={activeTab === "assignments" ? "" : "bg-transparent"}
            size="sm"
          >
            Assignments
          </Button>
          <Button
            onClick={() => setActiveTab("vehicles")}
            variant={activeTab === "vehicles" ? "default" : "outline"}
            className={activeTab === "vehicles" ? "" : "bg-transparent"}
            size="sm"
          >
            Vehicles
          </Button>
          <Button
            onClick={() => setActiveTab("vehicle-rules")}
            variant={activeTab === "vehicle-rules" ? "default" : "outline"}
            className={activeTab === "vehicle-rules" ? "" : "bg-transparent"}
            size="sm"
          >
            Rules
          </Button>
          <Button
            onClick={() => setActiveTab("map")}
            variant={activeTab === "map" ? "default" : "outline"}
            className={activeTab === "map" ? "" : "bg-transparent"}
            size="sm"
          >
            Map
          </Button>
          <Button
            onClick={() => setActiveTab("override")}
            variant={activeTab === "override" ? "default" : "outline"}
            className={activeTab === "override" ? "" : "bg-transparent"}
            size="sm"
          >
            Override
          </Button>
          <Button
            onClick={() => setActiveTab("metrics")}
            variant={activeTab === "metrics" ? "default" : "outline"}
            className={activeTab === "metrics" ? "" : "bg-transparent"}
            size="sm"
          >
            Metrics
          </Button>
          <Button
            onClick={() => setActiveTab("audit")}
            variant={activeTab === "audit" ? "default" : "outline"}
            className={activeTab === "audit" ? "" : "bg-transparent"}
            size="sm"
          >
            Audit
          </Button>
        </div>

        <Card className="p-6">
          {activeTab === "warehouses" && <WarehouseManagementTab />}
          {activeTab === "requests" && (
            <AdminRequestsTab
              onRequestAccepted={(requestId) => {
                setAcceptedRequestIds([...acceptedRequestIds, requestId]);
              }}
            />
          )}
          {activeTab === "assignments" && (
            <AdminAssignmentTab acceptedRequestIds={acceptedRequestIds} />
          )}
          {activeTab === "vehicles" && <AdminVehicleManagementTab />}
          {activeTab === "vehicle-rules" && <AdminVehicleRulesTab />}
          {activeTab === "map" && <AdminShipmentsMapTab />}
          {activeTab === "override" && <AdminOverrideAssignmentsTab />}
          {activeTab === "metrics" && <AdminPerformanceMetricsTab />}
          {activeTab === "audit" && <AdminAuditLogsTab />}
        </Card>
      </main>
    </div>
  );
}
