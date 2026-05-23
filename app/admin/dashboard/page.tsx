"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { AdminDashboardNav, getNavItemsByRole } from "@/app/components/AdminDashboardNav";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/app/components/loaders";
import { useTranslation } from "@/app/context/LocaleContext";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { t, isRtl } = useTranslation();

  useEffect(() => {
    if (
      !isLoading &&
      (!user || (user.role !== "admin" && user.role !== "operator"))
    ) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex">
          <div className="w-64 border-e border-border p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-10" />
            ))}
          </div>
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
            <Skeleton className="w-1/2 h-10 mb-2" />
            <Skeleton className="w-3/4 h-6 mb-8" />
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-40" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "operator")) {
    return null;
  }

  const navItems = getNavItemsByRole(user.role);

  const navLabels: Record<string, string> = {
    requests: t.admin.requests,
    users: t.admin.users,
    drivers: t.admin.drivers,
    drivers: t.admin.drivers,
    costOffers: t.admin.costOffers,
    override: t.admin.override,
    metrics: t.admin.metrics,
    audit: t.admin.audit,
    categories: t.admin.categories,
    costCriteria: t.admin.costCriteria,
  };

  const navDescriptions: Record<string, string> = {
    requests: t.homeAdmin.cardRequestsDesc,
    users: t.homeAdmin.cardUsersDesc,
    drivers: t.homeAdmin.cardDriversDesc,
    drivers: t.homeAdmin.cardDriversDesc,
    override: t.homeAdmin.cardOverrideDesc,
    metrics: t.homeAdmin.cardMetricsDesc,
    audit: t.homeAdmin.cardAuditDesc,
    categories: t.homeAdmin.cardCategoriesDesc,
    costCriteria: t.homeAdmin.cardCostCriteriaDesc,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <AdminDashboardNav userRole={user.role} isSticky={true} />

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {t.admin.dashboard}
            </h1>
            <p className="text-muted-foreground">
              {t.admin.manageSystem}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const label = navLabels[item.labelKey] ?? item.labelKey;
              const description = navDescriptions[item.labelKey] ?? "";

              return (
                <Link key={item.href} href={item.href}>
                  <Card className="p-6 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <ArrowRight
                        className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ${
                          isRtl ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1 text-lg">
                      {label}
                    </h3>
                    {description && (
                      <p className="text-sm text-muted-foreground">{description}</p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

