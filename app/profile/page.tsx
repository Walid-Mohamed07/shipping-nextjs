"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/app/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
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
  Edit2,
  MapPin,
  Trash2,
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

interface UserAddress {
  _id: string;
  fullName: string;
  mobile: string;
  street: string;
  building?: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
  addressType: string;
  primary?: boolean;
  deliveryInstructions?: string;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useProtectedRoute();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [error, setError] = useState("");

  // Fetch stats when user._id is available
  useEffect(() => {
    if (!user?._id) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/requests?userId=${user._id}`);
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
  }, [user?._id]);

  // Fetch user addresses
  useEffect(() => {
    if (!user?._id) return;

    const fetchAddresses = async () => {
      setIsLoadingAddresses(true);
      try {
        const response = await fetch(`/api/user/addresses?userId=${user._id}`);
        if (!response.ok) throw new Error("Failed to fetch addresses");
        const data = await response.json();
        setAddresses(data.addresses || []);
      } catch (err) {
        console.error("Error fetching addresses:", err);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [user?._id]);

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
                alt={user.fullName || "Profile"}
                className="w-24 h-24 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                <Package className="w-12 h-12 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {user.fullName || "User"}
                  </h1>
                  <p className="text-muted-foreground mb-2">{user.email}</p>
                  <div className="flex gap-4 flex-wrap">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      <span className="w-2 h-2 bg-primary rounded-full" />
                      {user.role}
                    </span>
                    {user.mobile && (
                      <span className="text-sm text-muted-foreground">
                        {user.mobile}
                      </span>
                    )}
                    {user.birthDate && (
                      <span className="text-sm text-muted-foreground">
                        Born: {new Date(user.birthDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Link href="/profile/edit">
                  <Button className="gap-2 cursor-pointer whitespace-nowrap">
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        {authLoading ? (
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

            {/* Addresses Section */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  Saved Addresses
                </h2>
                <Link href="/profile/addresses">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                    Manage Addresses
                  </Button>
                </Link>
              </div>

              {isLoadingAddresses ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-40 bg-muted rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : addresses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <div
                      key={address._id}
                      className="bg-card rounded-lg border border-border p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">
                            {address.fullName}
                          </h3>
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            {address.addressType}
                          </span>
                          {address.primary && (
                            <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                              Primary
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>{address.street}</p>
                        {address.building && (
                          <p>Building: {address.building}</p>
                        )}
                        <p>
                          {address.city}, {address.district}
                        </p>
                        <p>
                          {address.postalCode}, {address.country}
                        </p>
                        <p className="flex items-center gap-2 text-foreground">
                          <strong>Mobile:</strong> {address.mobile}
                        </p>
                        {address.deliveryInstructions && (
                          <p className="text-xs italic">
                            <strong>Instructions:</strong>{" "}
                            {address.deliveryInstructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-lg border border-border p-12 text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    No addresses saved yet
                  </p>
                  <Link href="/profile/addresses">
                    <Button className="gap-2 cursor-pointer">
                      <MapPin className="w-4 h-4" />
                      Add Your First Address
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
