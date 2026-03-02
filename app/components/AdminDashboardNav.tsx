"use client";

import React from "react";
import Link from "next/link";
import { UserRole } from "@/types/user";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  BarChart3,
  Lock,
  Building2,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "@/app/context/LocaleContext";

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const allNavItems: NavItem[] = [
  {
    labelKey: "requests",
    href: "/admin/dashboard/requests",
    icon: Package,
    roles: ["admin", "operator"],
  },
  {
    labelKey: "users",
    href: "/admin/dashboard/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    labelKey: "drivers",
    href: "/admin/dashboard/drivers",
    icon: Truck,
    roles: ["admin"],
  },
  {
    labelKey: "companies",
    href: "/admin/dashboard/companies",
    icon: Building2,
    roles: ["admin"],
  },
  {
    labelKey: "costOffers",
    href: "/admin/dashboard/cost-offers",
    icon: BarChart3,
    roles: ["company"],
  },
  {
    labelKey: "override",
    href: "/admin/dashboard/override",
    icon: Lock,
    roles: ["admin"],
  },
  {
    labelKey: "metrics",
    href: "/admin/dashboard/metrics",
    icon: BarChart3,
    roles: ["admin", "operator"],
  },
  {
    labelKey: "audit",
    href: "/admin/dashboard/audit",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
];

export const getNavItemsByRole = (role: UserRole): NavItem[] => {
  return allNavItems.filter((item) => item.roles.includes(role));
};

interface AdminDashboardNavProps {
  userRole: UserRole;
  currentSection?: string;
  showBackButton?: boolean;
  isSticky?: boolean;
}

export function AdminDashboardNav({
  userRole,
  currentSection,
  showBackButton = false,
  isSticky = false,
}: AdminDashboardNavProps) {
  const { t } = useTranslation();
  const navItems = getNavItemsByRole(userRole);

  const navLabels: Record<string, string> = {
    requests: t.admin.requests,
    users: t.admin.users,
    drivers: t.admin.drivers,
    companies: t.admin.companies,
    costOffers: t.admin.costOffers,
    override: t.admin.override,
    metrics: t.admin.metrics,
    audit: t.admin.audit,
  };

  return (
    <aside
      className={`w-64 bg-white dark:bg-slate-950 border-e border-border min-h-[calc(100vh-64px)] p-6 ${
        isSticky ? "sticky top-16 h-[calc(100vh-64px)] overflow-y-auto" : ""
      }`}
      dir="rtl"
    >
      {showBackButton && (
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          {t.admin.backToDashboard}
        </Link>
      )}

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection
            ? `/admin/dashboard/${currentSection}` === item.href
            : false;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-primary/10 hover:text-primary"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{navLabels[item.labelKey] ?? item.labelKey}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
