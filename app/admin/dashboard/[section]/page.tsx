"use client";

import React from "react";
import { useAuth } from "@/app/context/AuthContext";
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
import { AdminDashboardNav } from "@/app/components/AdminDashboardNav";
import { useTranslation } from "@/app/context/LocaleContext";

export default function DashboardSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = React.use(params);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const sectionTitles: Record<string, string> = {
    requests: t.admin.sectionRequests,
    assignments: t.admin.sectionAssignments,
    vehicles: t.admin.sectionVehicles,
    "vehicle-rules": t.admin.sectionVehicleRules,
    users: t.admin.sectionUsers,
    drivers: t.admin.sectionDrivers,
    companies: t.admin.sectionCompanies,
    "cost-offers": t.admin.sectionCostOffers,
    map: t.admin.sectionMap,
    override: t.admin.sectionOverride,
    metrics: t.admin.sectionMetrics,
    audit: t.admin.sectionAudit,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {t.common.loading}
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "operator")) {
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
        return <div className="text-center py-8">{t.common.requestedSection}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <AdminDashboardNav
          userRole={user.role}
          currentSection={section}
          showBackButton={true}
        />

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {sectionTitles[section] || t.admin.dashboard}
            </h1>
            <p className="text-muted-foreground">
              {t.admin.manageOpsSubtitle}
            </p>
          </div>

          <Card className="p-6">{renderSection()}</Card>
        </main>
      </div>
    </div>
  );
}
