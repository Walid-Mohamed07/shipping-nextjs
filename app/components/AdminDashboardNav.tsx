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
  ArrowLeft,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const allNavItems: NavItem[] = [
  // Common items (shared by both admin and operator)
  {
    label: "Requests",
    href: "/admin/dashboard/requests",
    icon: Package,
    roles: ["admin", "operator"],
  },
  {
    label: "Users",
    href: "/admin/dashboard/users",
    icon: Users,
    roles: ["admin"],
  },
  {
    label: "Drivers",
    href: "/admin/dashboard/drivers",
    icon: Truck,
    roles: ["admin"],
  },
  {
    label: "Companies",
    href: "/admin/dashboard/companies",
    icon: Building2,
    roles: ["admin"],
  },
  // Operator-only items
  {
    label: "Cost Offers",
    href: "/admin/dashboard/cost-offers",
    icon: BarChart3,
    roles: ["operator"],
  },
  // Admin-only items
  {
    label: "Override",
    href: "/admin/dashboard/override",
    icon: Lock,
    roles: ["admin"],
  },
  {
    label: "Metrics",
    href: "/admin/dashboard/metrics",
    icon: BarChart3,
    roles: ["admin", "operator"],
  },
  {
    label: "Audit",
    href: "/admin/dashboard/audit",
    icon: LayoutDashboard,
    roles: ["admin"],
  },
];

// Helper function to get nav items based on user role
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
  const navItems = getNavItemsByRole(userRole);

  return (
    <aside
      className={`w-64 bg-white border-r border-border min-h-[calc(100vh-64px)] p-6 ${
        isSticky ? "sticky top-16 h-[calc(100vh-64px)] overflow-y-auto" : ""
      }`}
    >
      {showBackButton && (
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
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
                  : "hover:bg-accent text-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
