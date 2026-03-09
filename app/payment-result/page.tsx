"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { useTranslation } from "@/app/context/LocaleContext";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Home,
  Package,
  AlertCircle,
} from "lucide-react";

function PaymentResultContent() {
  const { t, isRtl } = useTranslation();
  const { user, isLoading: authLoading } = useProtectedRoute();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<
    "loading" | "success" | "failed" | "pending"
  >("loading");
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [verifiedRequestId, setVerifiedRequestId] = useState<string | null>(
    null,
  );

  // Get params from URL (Kashier callback)
  const orderId =
    searchParams.get("orderId") || searchParams.get("merchantOrderId");
  const transactionId = searchParams.get("transactionId");
  const paymentStatus =
    searchParams.get("paymentStatus") || searchParams.get("status");
  const requestId = searchParams.get("requestId");

  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!orderId) {
        console.log("[Payment Result] No order ID provided");
        setStatus("pending");
        return;
      }

      console.log(
        "[Payment Result] Verifying payment with Kashier for order:",
        orderId,
      );

      try {
        // Call our backend to verify payment status with Kashier
        // Also pass the URL paymentStatus as a fallback
        const response = await fetch("/api/pay/verify-redirect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            paymentStatus, // From URL params (Kashier redirect includes this)
          }),
        });

        const data = await response.json();
        console.log("[Payment Result] Verification response:", data);

        if (response.ok && data.success) {
          setStatus("success");
          setVerifiedRequestId(data.requestId);
          setPaymentInfo({
            amount: data.amount,
            paymentStatus: data.paymentStatus,
            requestStatus: data.requestStatus,
          });

          // Auto-redirect to request page after 3 seconds
          setTimeout(() => {
            if (data.requestId) {
              router.push(`/request/${data.requestId}`);
            } else {
              router.push("/my-requests");
            }
          }, 3000);
        } else if (data.paymentStatus === "failed") {
          setStatus("failed");
          setVerifiedRequestId(data.requestId);
        } else {
          setStatus("pending");
        }
      } catch (error) {
        console.error("[Payment Result] Error verifying payment:", error);
        setStatus("pending");
      }
    };

    if (!authLoading) {
      checkPaymentStatus();
    }
  }, [authLoading, orderId, router]);

  // Translations
  const translations = {
    paymentResult: t.paymentResult || {
      success: "Payment Successful!",
      successDesc:
        "Your payment has been processed successfully. Your shipment request is now being processed.",
      failed: "Payment Failed",
      failedDesc:
        "We couldn't process your payment. Please try again or use a different payment method.",
      pending: "Payment Processing",
      pendingDesc:
        "Your payment is being processed. You'll receive a confirmation once it's complete.",
      viewRequest: "View Request",
      tryAgain: "Try Again",
      goHome: "Go to Home",
      myRequests: "My Requests",
      transactionId: "Transaction ID",
      orderId: "Order ID",
      amount: "Amount",
    },
  };

  const pt = translations.paymentResult;

  if (authLoading || status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-semibold">
            Verifying payment with Kashier...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Please wait a moment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-xl border border-border p-8 text-center shadow-lg">
          {/* Status Icon */}
          <div className="mb-6">
            {status === "success" && (
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === "failed" && (
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
            )}
            {status === "pending" && (
              <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
              </div>
            )}
          </div>

          {/* Status Title */}
          <h1
            className={`text-2xl font-bold mb-2 ${
              status === "success"
                ? "text-green-600 dark:text-green-400"
                : status === "failed"
                  ? "text-red-600 dark:text-red-400"
                  : "text-yellow-600 dark:text-yellow-400"
            }`}
          >
            {status === "success"
              ? pt.success
              : status === "failed"
                ? pt.failed
                : pt.pending}
          </h1>

          {/* Status Description */}
          <p className="text-muted-foreground mb-6">
            {status === "success"
              ? pt.successDesc
              : status === "failed"
                ? pt.failedDesc
                : pt.pendingDesc}
          </p>

          {/* Transaction Details */}
          {(orderId || transactionId || paymentInfo) && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
              {orderId && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{pt.orderId}:</span>
                  <span className="font-mono text-foreground">{orderId}</span>
                </div>
              )}
              {transactionId && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {pt.transactionId}:
                  </span>
                  <span className="font-mono text-foreground">
                    {transactionId.slice(0, 16)}...
                  </span>
                </div>
              )}
              {paymentInfo?.amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{pt.amount}:</span>
                  <span className="font-semibold text-foreground">
                    ${paymentInfo.amount.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {status === "success" && verifiedRequestId && (
              <Link href={`/request/${verifiedRequestId}`} className="block">
                <Button className="w-full cursor-pointer" size="lg">
                  <Package className="w-4 h-4 mr-2" />
                  {pt.viewRequest}
                </Button>
              </Link>
            )}

            {status === "failed" && (verifiedRequestId || requestId) && (
              <Link
                href={`/checkout?requestId=${verifiedRequestId || requestId}`}
                className="block"
              >
                <Button className="w-full cursor-pointer" size="lg">
                  {pt.tryAgain}
                </Button>
              </Link>
            )}

            <Link href="/my-requests" className="block">
              <Button
                variant="outline"
                className="w-full bg-transparent cursor-pointer"
                size="lg"
              >
                <Package className="w-4 h-4 mr-2" />
                {pt.myRequests}
              </Button>
            </Link>

            <Link href="/" className="block">
              <Button
                variant="ghost"
                className="w-full cursor-pointer"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                {pt.goHome}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
