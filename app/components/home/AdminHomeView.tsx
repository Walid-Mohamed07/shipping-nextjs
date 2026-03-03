"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useTranslation } from "@/app/context/LocaleContext";
import { getNavItemsByRole } from "@/app/components/AdminDashboardNav";

export function AdminHomeView() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();

  const navLabels: Record<string, string> = {
    requests: t.homeAdmin.cardRequestsTitle,
    users: t.homeAdmin.cardUsersTitle,
    drivers: t.homeAdmin.cardDriversTitle,
    companies: t.homeAdmin.cardCompaniesTitle,
    override: t.homeAdmin.cardOverrideTitle,
    metrics: t.homeAdmin.cardMetricsTitle,
    audit: t.homeAdmin.cardAuditTitle,
    categories: t.homeAdmin.cardCategoriesTitle,
    costCriteria: t.homeAdmin.cardCostCriteriaTitle,
  };

  const navDescriptions: Record<string, string> = {
    requests: t.homeAdmin.cardRequestsDesc,
    users: t.homeAdmin.cardUsersDesc,
    drivers: t.homeAdmin.cardDriversDesc,
    companies: t.homeAdmin.cardCompaniesDesc,
    override: t.homeAdmin.cardOverrideDesc,
    metrics: t.homeAdmin.cardMetricsDesc,
    audit: t.homeAdmin.cardAuditDesc,
    categories: t.homeAdmin.cardCategoriesDesc,
    costCriteria: t.homeAdmin.cardCostCriteriaDesc,
  };

  const cardColors: Record<string, { bg: string; icon: string }> = {
    requests: { bg: "bg-blue-100 dark:bg-blue-900/20", icon: "text-blue-600" },
    users: { bg: "bg-green-100 dark:bg-green-900/20", icon: "text-green-600" },
    drivers: { bg: "bg-cyan-100 dark:bg-cyan-900/20", icon: "text-cyan-600" },
    companies: { bg: "bg-purple-100 dark:bg-purple-900/20", icon: "text-purple-600" },
    override: { bg: "bg-red-100 dark:bg-red-900/20", icon: "text-red-600" },
    metrics: { bg: "bg-indigo-100 dark:bg-indigo-900/20", icon: "text-indigo-600" },
    audit: { bg: "bg-yellow-100 dark:bg-yellow-900/20", icon: "text-yellow-600" },
    categories: { bg: "bg-teal-100 dark:bg-teal-900/20", icon: "text-teal-600" },
    costCriteria: { bg: "bg-orange-100 dark:bg-orange-900/20", icon: "text-orange-600" },
  };

  const navItems = getNavItemsByRole(user?.role ?? "admin");

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          {t.homeAdmin.title}
        </h1>
        <p className="text-muted-foreground mb-12">
          {t.homeAdmin.subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const label = navLabels[item.labelKey] ?? item.labelKey;
            const description = navDescriptions[item.labelKey] ?? "";
            const colors = cardColors[item.labelKey] ?? {
              bg: "bg-gray-100 dark:bg-gray-900/20",
              icon: "text-gray-600",
            };

            return (
              <div
                key={item.href}
                className="bg-white dark:bg-slate-950 rounded-lg p-6 border border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => router.push(item.href)}
              >
                <div
                  className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {label}
                </h3>
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
