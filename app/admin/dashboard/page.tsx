"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Header } from "@/app/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  BarChart3,
  Lock,
  Building2,
} from "lucide-react";

const navItems = [
  { label: "Requests", href: "/admin/dashboard/requests", icon: Package },
  // {
  //   label: "Assignments",
  //   href: "/admin/dashboard/assignments",
  //   icon: LayoutDashboard,
  // },
  // { label: "Vehicles", href: "/admin/dashboard/vehicles", icon: Truck },
  // {
  //   label: "Vehicle Rules",
  //   href: "/admin/dashboard/vehicle-rules",
  //   icon: Settings,
  // },
  { label: "Users", href: "/admin/dashboard/users", icon: Users },
  { label: "Drivers", href: "/admin/dashboard/drivers", icon: Truck },
  { label: "Companies", href: "/admin/dashboard/companies", icon: Building2 },
  {
    label: "Cost Offers",
    href: "/admin/dashboard/cost-offers",
    icon: BarChart3,
  },
  // { label: "Map", href: "/admin/dashboard/map", icon: Map },
  { label: "Override", href: "/admin/dashboard/override", icon: Lock },
  { label: "Metrics", href: "/admin/dashboard/metrics", icon: BarChart3 },
  { label: "Audit", href: "/admin/dashboard/audit", icon: LayoutDashboard },
];

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

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
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "operator")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-border min-h-[calc(100vh-64px)] p-6">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors text-foreground hover:text-foreground"
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
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Select a section from the sidebar to get started
            </p>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Welcome to the Admin Dashboard
            </p>
            <p className="text-sm text-muted-foreground">
              Use the navigation menu on the left to access different sections
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
