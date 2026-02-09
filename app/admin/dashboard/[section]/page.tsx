"use client";

import React from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Header } from "@/app/components/Header";
import { AdminRequestsTab } from "@/app/components/AdminRequestsTab";
import { AdminAssignmentTab } from "@/app/components/AdminAssignmentTab";
import { AdminVehicleRulesTab } from "@/app/components/AdminVehicleRulesTab";
import { AdminVehicleManagementTab } from "@/app/components/AdminVehicleManagementTab";
import { AdminShipmentsMapTab } from "@/app/components/AdminShipmentsMapTab";
import { AdminOverrideAssignmentsTab } from "@/app/components/AdminOverrideAssignmentsTab";
import { AdminPerformanceMetricsTab } from "@/app/components/AdminPerformanceMetricsTab";
import { AdminAuditLogsTab } from "@/app/components/AdminAuditLogsTab";
import { AdminCompaniesTab } from "@/app/components/AdminCompaniesTab";
import { AdminUsersTab } from "@/app/components/AdminUsersTab";
import { AdminDriversTab } from "@/app/components/AdminDriversTab";
import { OperatorCostOffersTab } from "@/app/components/OperatorCostOffersTab";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Map,
  Settings,
  BarChart3,
  Lock,
  Building2,
} from "lucide-react";

const navItems = [
  { label: "Requests", href: "/admin/dashboard/requests", icon: Package },
  {
    label: "Assignments",
    href: "/admin/dashboard/assignments",
    icon: LayoutDashboard,
  },
  { label: "Vehicles", href: "/admin/dashboard/vehicles", icon: Truck },
  {
    label: "Vehicle Rules",
    href: "/admin/dashboard/vehicle-rules",
    icon: Settings,
  },
  { label: "Users", href: "/admin/dashboard/users", icon: Users },
  { label: "Drivers", href: "/admin/dashboard/drivers", icon: Truck },
  { label: "Companies", href: "/admin/dashboard/companies", icon: Building2 },
  {
    label: "Cost Offers",
    href: "/admin/dashboard/cost-offers",
    icon: BarChart3,
  },
  { label: "Map", href: "/admin/dashboard/map", icon: Map },
  { label: "Override", href: "/admin/dashboard/override", icon: Lock },
  { label: "Metrics", href: "/admin/dashboard/metrics", icon: BarChart3 },
  { label: "Audit", href: "/admin/dashboard/audit", icon: LayoutDashboard },
];

const sectionTitles: Record<string, string> = {
  requests: "Requests Management",
  assignments: "Assignments Management",
  vehicles: "Vehicle Management",
  "vehicle-rules": "Vehicle & Capacity Rules",
  users: "User Management",
  drivers: "Driver Management",
  companies: "Company Management",
  "cost-offers": "Cost Offers Management",
  map: "Live Shipment Map",
  override: "Override Assignments",
  metrics: "Performance Metrics",
  audit: "Audit Logs",
};

interface DashboardSectionProps {
  params: { section: string };
}

export default function DashboardSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = React.use(params); // <- unwrap params before using
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    router.push("/");
    return null;
  }

  const renderSection = () => {
    switch (section) {
      case "requests":
        return <AdminRequestsTab />;
      case "assignments":
        return <AdminAssignmentTab acceptedOrderIds={[]} />;
      case "vehicles":
        return <AdminVehicleManagementTab />;
      case "vehicle-rules":
        return <AdminVehicleRulesTab />;
      case "users":
        return <AdminUsersTab />;
      case "drivers":
        return <AdminDriversTab />;
      case "companies":
        return <AdminCompaniesTab />;
      case "cost-offers":
        return <OperatorCostOffersTab />;
      case "map":
        return <AdminShipmentsMapTab />;
      case "override":
        return <AdminOverrideAssignmentsTab />;
      case "metrics":
        return <AdminPerformanceMetricsTab />;
      case "audit":
        return <AdminAuditLogsTab />;
      default:
        return <div className="text-center py-8">Section not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-border min-h-[calc(100vh-64px)] p-6">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = `/admin/dashboard/${section}` === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {sectionTitles[section] || "Dashboard"}
            </h1>
            <p className="text-muted-foreground">
              Manage and monitor your shipping operations
            </p>
          </div>

          <Card className="p-6">{renderSection()}</Card>
        </main>
      </div>
    </div>
  );
}
