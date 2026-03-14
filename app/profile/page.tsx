"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/context/AuthContext";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { toast } from "sonner";
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
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Globe,
} from "lucide-react";
import Link from "next/link";
import { CurrencySelector, PriceDisplay } from "@/app/components/PriceDisplay";
import { useCurrency } from "@/app/context/CurrencyContext";

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
  id: string;
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
  const { user, isLoading: authLoading, setUser } = useProtectedRoute();
  const { currency } = useCurrency();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [error, setError] = useState("");

  // OTP Verification states
  const [emailOTP, setEmailOTP] = useState("");
  const [mobileOTP, setMobileOTP] = useState("");
  const [sendingEmailOTP, setSendingEmailOTP] = useState(false);
  const [sendingMobileOTP, setSendingMobileOTP] = useState(false);
  const [verifyingEmailOTP, setVerifyingEmailOTP] = useState(false);
  const [verifyingMobileOTP, setVerifyingMobileOTP] = useState(false);
  const [emailOTPSent, setEmailOTPSent] = useState(false);
  const [mobileOTPSent, setMobileOTPSent] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [mobileCountdown, setMobileCountdown] = useState(0);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(
        () => setEmailCountdown(emailCountdown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  useEffect(() => {
    if (mobileCountdown > 0) {
      const timer = setTimeout(
        () => setMobileCountdown(mobileCountdown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [mobileCountdown]);

  // Fetch stats when user._id is available
  useEffect(() => {
    if (!user?._id && !user?.id) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/requests?userId=${user._id || user.id}`,
        );
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
            r.selectedCompany?.cost || r.cost /* || r.primaryCost */ || 0, // TEMPORARILY HIDDEN - primaryCost
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
  }, [user?._id, user?.id]);

  // Fetch user addresses
  useEffect(() => {
    if (!user?._id && !user?.id) return;

    const fetchAddresses = async () => {
      setIsLoadingAddresses(true);
      try {
        const response = await fetch(
          `/api/user/addresses?userId=${user._id || user.id}`,
        );
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
  }, [user?._id, user?.id]);

  // OTP Verification functions
  const sendEmailOTP = async () => {
    if (!user?._id && !user?.id) return;
    setSendingEmailOTP(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          value: user.email,
          userId: user._id || user.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send email OTP");
      }

      setEmailOTPSent(true);
      setEmailCountdown(60);
      toast.success("Verification code sent to your email");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send email OTP",
      );
    } finally {
      setSendingEmailOTP(false);
    }
  };

  const sendMobileOTP = async () => {
    if (!user?._id && !user?.id) return;
    setSendingMobileOTP(true);
    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "mobile",
          value: user.mobile,
          userId: user._id || user.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send mobile OTP");
      }

      setMobileOTPSent(true);
      setMobileCountdown(60);
      toast.success("Verification code sent to your mobile");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send mobile OTP",
      );
    } finally {
      setSendingMobileOTP(false);
    }
  };

  const verifyEmailOTP = async () => {
    if (!user?._id && !user?.id) return;
    setVerifyingEmailOTP(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          otp: emailOTP,
          userId: user._id || user.id,
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify email");
      }

      // Update user in context
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      setEmailOTP("");
      setEmailOTPSent(false);
      toast.success("Email verified successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to verify email",
      );
    } finally {
      setVerifyingEmailOTP(false);
    }
  };

  const verifyMobileOTP = async () => {
    if (!user?._id && !user?.id) return;
    setVerifyingMobileOTP(true);
    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "mobile",
          otp: mobileOTP,
          userId: user._id || user.id,
        }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify mobile");
      }

      // Update user in context
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      setMobileOTP("");
      setMobileOTPSent(false);
      toast.success("Mobile verified successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to verify mobile",
      );
    } finally {
      setVerifyingMobileOTP(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
        {authLoading ? (
          <div className="bg-card rounded-lg border border-border p-8 mb-6 animate-pulse">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-8 bg-muted rounded w-1/3 mb-4" />
                <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-20" />
                  <div className="h-6 bg-muted rounded w-24" />
                </div>
              </div>
              <div className="h-10 bg-muted rounded w-32" />
            </div>
          </div>
        ) : (
          <>
            <div className="bg-card rounded-lg border border-border p-8 mb-6">
              <div className="flex items-start gap-6">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user?.fullName || "Profile"}
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
                        {user?.fullName || "User"}
                      </h1>
                      <p className="text-muted-foreground mb-2">
                        {user?.email}
                      </p>
                      <div className="flex gap-4 flex-wrap">
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          <span className="w-2 h-2 bg-primary rounded-full" />
                          {user?.role}
                        </span>
                        {user?.mobile && (
                          <span className="text-sm text-muted-foreground">
                            {user.mobile}
                          </span>
                        )}
                        {user?.birthDate && (
                          <span className="text-sm text-muted-foreground">
                            Born:{" "}
                            {new Date(user.birthDate).toLocaleDateString()}
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

            {/* Preferences Section */}
            <div className="bg-card rounded-lg border border-border p-6 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Preferences
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Preferred Currency
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All prices will be displayed in this currency
                  </p>
                </div>
                <CurrencySelector showLabel={false} />
              </div>
            </div>
          </>
        )}

        {/* Verification Status Section */}
        {!authLoading && user && (
          <div className="bg-card rounded-lg border border-border p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Account Verification
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email Verification */}
              <div
                className={`p-4 rounded-lg border ${user.emailVerified ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-amber-500 bg-amber-50 dark:bg-amber-900/10"}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${user.emailVerified ? "bg-green-500" : "bg-amber-500"}`}
                  >
                    {user.emailVerified ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <Mail className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Email</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  {user.emailVerified ? (
                    <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-amber-600 text-sm font-medium flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Not Verified
                    </span>
                  )}
                </div>

                {!user.emailVerified && (
                  <div className="space-y-2">
                    {!emailOTPSent ? (
                      <Button
                        type="button"
                        onClick={sendEmailOTP}
                        disabled={sendingEmailOTP}
                        size="sm"
                        className="w-full cursor-pointer"
                      >
                        {sendingEmailOTP ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Verification Code"
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={emailOTP}
                            onChange={(e) =>
                              setEmailOTP(
                                e.target.value.replace(/\D/g, "").slice(0, 6),
                              )
                            }
                            className="flex-1 text-center tracking-widest"
                            maxLength={6}
                          />
                          <Button
                            type="button"
                            onClick={verifyEmailOTP}
                            disabled={
                              verifyingEmailOTP || emailOTP.length !== 6
                            }
                            size="sm"
                            className="cursor-pointer"
                          >
                            {verifyingEmailOTP ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Verify"
                            )}
                          </Button>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">
                            Didn't receive the code?
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={sendEmailOTP}
                            disabled={emailCountdown > 0 || sendingEmailOTP}
                            className="cursor-pointer h-auto py-1 px-2 text-xs"
                          >
                            {emailCountdown > 0
                              ? `Resend in ${emailCountdown}s`
                              : "Resend"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile Verification */}
              <div
                className={`p-4 rounded-lg border ${user.mobileVerified ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-amber-500 bg-amber-50 dark:bg-amber-900/10"}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${user.mobileVerified ? "bg-green-500" : "bg-amber-500"}`}
                  >
                    {user.mobileVerified ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : (
                      <Phone className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">Mobile</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.mobile || "Not set"}
                    </p>
                  </div>
                  {user.mobileVerified ? (
                    <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="text-amber-600 text-sm font-medium flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      Not Verified
                    </span>
                  )}
                </div>

                {!user.mobileVerified && user.mobile && (
                  <div className="space-y-2">
                    {!mobileOTPSent ? (
                      <Button
                        type="button"
                        onClick={sendMobileOTP}
                        disabled={sendingMobileOTP}
                        size="sm"
                        className="w-full cursor-pointer"
                      >
                        {sendingMobileOTP ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Verification Code"
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={mobileOTP}
                            onChange={(e) =>
                              setMobileOTP(
                                e.target.value.replace(/\D/g, "").slice(0, 6),
                              )
                            }
                            className="flex-1 text-center tracking-widest"
                            maxLength={6}
                          />
                          <Button
                            type="button"
                            onClick={verifyMobileOTP}
                            disabled={
                              verifyingMobileOTP || mobileOTP.length !== 6
                            }
                            size="sm"
                            className="cursor-pointer"
                          >
                            {verifyingMobileOTP ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Verify"
                            )}
                          </Button>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">
                            Didn't receive the code?
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={sendMobileOTP}
                            disabled={mobileCountdown > 0 || sendingMobileOTP}
                            className="cursor-pointer h-auto py-1 px-2 text-xs"
                          >
                            {mobileCountdown > 0
                              ? `Resend in ${mobileCountdown}s`
                              : "Resend"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Verification Notice */}
            {(!user.emailVerified || !user.mobileVerified) && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Please verify your email and mobile to create shipping
                  requests.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Statistics Grid */}
        {authLoading || isLoading ? (
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
                    <PriceDisplay
                      amount={stats.totalSpent}
                      size="lg"
                      className="text-2xl font-bold text-foreground"
                    />
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      Average Cost Per Request
                    </p>
                    <PriceDisplay
                      amount={stats.averageCost}
                      size="lg"
                      className="text-2xl font-bold text-foreground"
                    />
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
                      key={address.id}
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
