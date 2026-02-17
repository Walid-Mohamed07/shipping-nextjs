"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/app/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { toast, Toaster } from "sonner";
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Wrench,
  BoxSelect,
} from "lucide-react";
import Link from "next/link";

interface UserStats {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  cancelledRequests: number;
  totalSpent: number;
  averageCost: number;
  requestsWithServices: number;
  assemblyDisassemblyRequests: number;
  packagingRequests: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const hasFetched = useRef(false);

  // Handle redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  // Fetch stats only once when user.id is available
  useEffect(() => {
    if (!user?.id || hasFetched.current) return;

    hasFetched.current = true;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/requests?userId=${user.id}`);
        if (!response.ok) throw new Error("Failed to fetch requests");
        const data = await response.json();
        const requests = data.requests || [];

        // Calculate statistics
        const totalRequests = requests.length;
        const completedRequests = requests.filter(
          (r: any) => r.deliveryStatus === "Delivered",
        ).length;
        const pendingRequests = requests.filter(
          (r: any) => r.requestStatus === "Pending",
        ).length;
        const cancelledRequests = requests.filter(
          (r: any) => r.requestStatus === "Cancelled",
        ).length;

        const totalSpent = requests.reduce((sum: number, r: any) => {
          const cost = Number(
            r.selectedCompany?.cost || r.cost || r.primaryCost || 0,
          );
          return sum + cost;
        }, 0);

        const averageCost = totalRequests > 0 ? totalSpent / totalRequests : 0;

        const requestsWithServices = requests.filter((r: any) =>
          r.items?.some(
            (item: any) =>
              item.services &&
              (item.services.canBeAssembledDisassembled ||
                item.services.assemblyDisassembly ||
                item.services.packaging),
          ),
        ).length;

        const assemblyDisassemblyRequests = requests.filter((r: any) =>
          r.items?.some(
            (item: any) =>
              item.services &&
              (item.services.canBeAssembledDisassembled ||
                item.services.assemblyDisassembly),
          ),
        ).length;

        const packagingRequests = requests.filter((r: any) =>
          r.items?.some(
            (item: any) => item.services && item.services.packaging,
          ),
        ).length;

        setStats({
          totalRequests,
          completedRequests,
          pendingRequests,
          cancelledRequests,
          totalSpent,
          averageCost,
          requestsWithServices,
          assemblyDisassemblyRequests,
          packagingRequests,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch statistics";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user?.id]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Header />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/my-requests">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent cursor-pointer mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Requests
          </Button>
        </Link>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-card rounded-lg border border-border p-8 mb-6">
          <div className="flex items-start gap-6">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name || "Profile"}
                className="w-24 h-24 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                <Package className="w-12 h-12 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {user.name || "User"}
              </h1>
              <p className="text-muted-foreground mb-2">{user.email}</p>
              <div className="flex gap-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <span className="w-2 h-2 bg-primary rounded-full" />
                  {user.role}
                </span>
                {user.mobile && (
                  <span className="text-sm text-muted-foreground">
                    {user.mobile}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Main Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Total Requests
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {stats.totalRequests}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-blue-600 opacity-50" />
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Completed
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {stats.completedRequests}
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-600 opacity-50" />
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Pending
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {stats.pendingRequests}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
                </div>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Cancelled
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                      {stats.cancelledRequests}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-600 opacity-50" />
                </div>
              </div>
            </div>

            {/* Cost and Services Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Spending Statistics */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Spending Overview
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Total Spent
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      ${stats.totalSpent.toFixed(2)}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      Average Cost Per Request
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      ${stats.averageCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Services Used */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Services Used
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        <Wrench className="w-3 h-3" />
                        Assembly/Disassembly
                      </span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {stats.assemblyDisassemblyRequests}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
                        <BoxSelect className="w-3 h-3" />
                        Packaging
                      </span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {stats.packagingRequests}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      Total Requests with Services
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      {stats.requestsWithServices} (
                      {stats.totalRequests > 0
                        ? Math.round(
                            (stats.requestsWithServices / stats.totalRequests) *
                              100,
                          )
                        : 0}
                      %)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <Link href="/new-request" className="flex-1">
                <Button className="w-full gap-2 cursor-pointer">
                  <Package className="w-4 h-4" />
                  Create New Request
                </Button>
              </Link>
              <Link href="/my-requests" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full gap-2 bg-transparent cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  View All Requests
                </Button>
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
