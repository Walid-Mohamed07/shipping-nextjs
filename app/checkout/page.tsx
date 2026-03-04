"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { useTranslation } from "@/app/context/LocaleContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Package,
  MapPin,
  Truck,
} from "lucide-react";
import type { Request } from "@/types";

export default function CheckoutPage() {
  const { t, isRtl, locale } = useTranslation();
  const { user, isLoading: authLoading } = useProtectedRoute();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");

  const [request, setRequest] = useState<Request | null>(null);
  const [wallet, setWallet] = useState<{
    balance: number;
    currency: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [useWallet, setUseWallet] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Translations for this page
  const translations = {
    checkout: t.checkout || {
      title: "Checkout",
      orderSummary: "Order Summary",
      paymentMethod: "Payment Method",
      card: "Credit / Debit Card",
      wallet: "Pay with Wallet",
      walletBalance: "Wallet Balance",
      useWalletBalance: "Use Wallet Balance",
      amountFromWallet: "Amount from wallet",
      remainingAmount: "Amount to pay by card",
      totalAmount: "Total Amount",
      shippingCost: "Shipping Cost",
      securePayment: "Secure Payment",
      securePaymentDesc: "Your payment is protected by bank-level security",
      payNow: "Pay Now",
      processing: "Processing...",
      backToRequest: "Back to Request",
      insufficientData: "Invalid request data",
      notReadyForPayment: "This request is not ready for payment",
      paymentInitiated: "Redirecting to payment...",
      paymentError: "Failed to initiate payment",
      requestNotFound: "Request not found",
      route: "Route",
      from: "From",
      to: "To",
      acceptedOffer: "Accepted Offer",
      company: "Shipping Company",
      items: "Items",
      proceedToPayment: "Proceed to Payment",
    },
  };

  const ct = translations.checkout;

  // Fetch request and wallet data
  const fetchData = useCallback(async () => {
    if (!requestId) {
      setError(ct.insufficientData);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch request and wallet in parallel
      const [requestRes, walletRes] = await Promise.all([
        fetch(`/api/requests/${requestId}`),
        fetch("/api/user/wallet"),
      ]);

      if (!requestRes.ok) {
        throw new Error(ct.requestNotFound);
      }

      const requestData = await requestRes.json();
      const reqObj = requestData.request || requestData;
      setRequest(reqObj);

      // Validate request is ready for payment
      if (
        reqObj.requestStatus !== "Assigned to Company" ||
        !reqObj.selectedCompany
      ) {
        setError(ct.notReadyForPayment);
        setLoading(false);
        return;
      }

      // Check if already paid
      if (reqObj.paymentStatus === "paid") {
        router.push(`/request/${requestId}`);
        return;
      }

      // Get wallet data
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setWallet(walletData.wallet);
      }

      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [requestId, router, ct]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [authLoading, user, fetchData]);

  // Calculate amounts
  const totalAmount =
    request?.selectedCompany?.finalPrice || request?.selectedCompany?.cost || 0;
  const maxWalletUsage = Math.min(wallet?.balance || 0, totalAmount);
  const cardAmount = useWallet
    ? Math.max(0, totalAmount - walletAmount)
    : totalAmount;

  // Handle wallet amount change
  const handleWalletAmountChange = (value: number) => {
    const amount = Math.min(Math.max(0, value), maxWalletUsage);
    setWalletAmount(amount);
  };

  // Handle payment
  const handlePayment = async () => {
    if (!requestId || !request) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          paymentMethod: cardAmount > 0 ? "card" : "wallet",
          useWallet,
          walletAmount: useWallet ? walletAmount : 0,
        }),
      });

      console.log("Payment initiation response:", response);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || ct.paymentError);
      }

      if (data.success) {
        if (data.paymentUrl) {
          // Redirect to Kashier payment page
          toast.success(ct.paymentInitiated);
          window.location.href = data.paymentUrl;
        } else if (data.payment?.status === "completed") {
          // Fully paid by wallet
          toast.success("Payment completed!");
          router.push(`/request/${requestId}?payment=success`);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : ct.paymentError);
    } finally {
      setIsProcessing(false);
    }
  };

  // Format location
  const formatLocation = (loc: any) => {
    if (!loc) return "-";
    if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
    if (loc.city) return loc.city;
    if (loc.country) return loc.country;
    return "-";
  };

  if (!user) return null;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-red-800 dark:text-red-400 mb-2">
                Error
              </h2>
              <p className="text-red-700 dark:text-red-400">{error}</p>
              <Link href="/my-requests" className="mt-4 inline-block">
                <Button className="cursor-pointer" variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Requests
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link href={`/request/${requestId}`} className="inline-block mb-6">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {ct.backToRequest}
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">{ct.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request Details */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {ct.orderSummary}
              </h2>

              {/* Request ID */}
              <div className="mb-4">
                <span className="text-sm text-muted-foreground">
                  Order ID:{" "}
                </span>
                <span className="font-semibold text-foreground">
                  {request?.publicId}
                </span>
              </div>

              {/* Route */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{ct.from}</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatLocation(request?.source)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{ct.to}</p>
                    <p className="text-sm font-medium text-foreground">
                      {formatLocation(request?.destination)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Count */}
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {ct.items}:{" "}
                  <span className="font-medium text-foreground">
                    {request?.items?.length || 0}
                  </span>
                </p>
              </div>

              {/* Selected Company */}
              {request?.selectedCompany && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {ct.company}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-background rounded-full px-2 py-1">
                      <span className="text-yellow-500 text-xs">★</span>
                      <span className="text-xs font-semibold">
                        {request.selectedCompany.rate}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    ${totalAmount.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                {ct.paymentMethod}
              </h2>

              {/* Wallet Option */}
              {wallet && wallet.balance > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <p className="font-medium text-foreground">
                          {ct.walletBalance}
                        </p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          ${wallet.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => {
                          setUseWallet(e.target.checked);
                          if (e.target.checked) {
                            setWalletAmount(maxWalletUsage);
                          } else {
                            setWalletAmount(0);
                          }
                        }}
                        className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-foreground">
                        {ct.useWalletBalance}
                      </span>
                    </label>
                  </div>

                  {useWallet && (
                    <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        {ct.amountFromWallet}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">$</span>
                        <input
                          type="number"
                          min={0}
                          max={maxWalletUsage}
                          step={0.01}
                          value={walletAmount}
                          onChange={(e) =>
                            handleWalletAmountChange(
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWalletAmount(maxWalletUsage)}
                          className="bg-transparent cursor-pointer"
                        >
                          Max
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card Payment Info */}
              {cardAmount > 0 && (
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {ct.card}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {useWallet ? ct.remainingAmount : ct.totalAmount}:
                    <span className="font-bold text-foreground ml-2">
                      ${cardAmount.toFixed(2)}
                    </span>
                  </p>
                </div>
              )}

              {/* Secure Payment Badge */}
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-green-500" />
                <span>{ct.securePaymentDesc}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border p-6 sticky top-6">
              <h3 className="font-semibold text-foreground mb-4">
                Payment Summary
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {ct.shippingCost}
                  </span>
                  <span className="font-medium">${totalAmount.toFixed(2)}</span>
                </div>

                {useWallet && walletAmount > 0 && (
                  <div className="flex justify-between text-sm text-purple-600 dark:text-purple-400">
                    <span>Wallet Payment</span>
                    <span>-${walletAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-foreground">
                      {cardAmount > 0 ? "Card Payment" : "Total"}
                    </span>
                    <span className="font-bold text-xl text-primary">
                      ${cardAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePayment}
                disabled={isProcessing || totalAmount <= 0}
                className="w-full cursor-pointer"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {ct.processing}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {cardAmount > 0 ? ct.payNow : "Complete Payment"}
                  </>
                )}
              </Button>

              {/* Payment Security */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  {ct.securePayment}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
