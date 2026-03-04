"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { useTranslation } from "@/app/context/LocaleContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  CreditCard,
  History,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface WalletData {
  id: string;
  balance: number;
  currency: string;
  status: string;
  totalCredits: number;
  totalDebits: number;
  lastTransactionAt?: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  createdAt: string;
  reference?: string;
  request?: {
    id: string;
    publicId: string;
  };
}

function WalletContent() {
  const { t, isRtl, locale } = useTranslation();
  const { user, isLoading: authLoading } = useProtectedRoute();
  const searchParams = useSearchParams();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupAmount, setTopupAmount] = useState<number>(50);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Check for topup result from URL
  useEffect(() => {
    const topupStatus = searchParams.get("topup");
    if (topupStatus === "success") {
      toast.success("Wallet topped up successfully!");
    } else if (topupStatus === "failed") {
      toast.error("Wallet topup failed. Please try again.");
    }
  }, [searchParams]);

  // Fetch wallet and transactions
  const fetchWallet = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/wallet");
      if (response.ok) {
        const data = await response.json();
        setWallet(data.wallet);
        setTransactions(data.recentTransactions || []);
      }
    } catch (err) {
      toast.error("Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch more transactions
  const fetchMoreTransactions = async () => {
    try {
      setLoadingMore(true);
      const response = await fetch(`/api/user/wallet/transactions?page=${page + 1}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setTransactions((prev) => [...prev, ...data.transactions]);
        setPage(page + 1);
        setHasMore(data.pagination.hasMore);
      }
    } catch (err) {
      toast.error("Failed to load more transactions");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchWallet();
    }
  }, [authLoading, user, fetchWallet]);

  // Handle topup
  const handleTopup = async () => {
    if (topupAmount < 1) {
      toast.error("Minimum topup amount is $1");
      return;
    }
    if (topupAmount > 10000) {
      toast.error("Maximum topup amount is $10,000");
      return;
    }

    try {
      setTopupLoading(true);
      const response = await fetch("/api/user/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: topupAmount }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate topup");
      }

      if (data.paymentUrl) {
        toast.success("Redirecting to payment...");
        window.location.href = data.paymentUrl;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to initiate topup");
    } finally {
      setTopupLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit":
      case "topup":
        return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case "debit":
      case "payment":
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case "refund":
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      default:
        return <CreditCard className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">{status}</span>;
    }
  };

  // Translations
  const wt = t.wallet || {
    title: "My Wallet",
    balance: "Available Balance",
    topup: "Top Up",
    topupWallet: "Top Up Wallet",
    enterAmount: "Enter amount to add to your wallet",
    quickAmounts: "Quick amounts",
    customAmount: "Custom amount",
    proceedToPayment: "Proceed to Payment",
    cancel: "Cancel",
    transactions: "Transaction History",
    noTransactions: "No transactions yet",
    viewAll: "View All",
    totalCredits: "Total Credits",
    totalDebits: "Total Spent",
    loadMore: "Load More",
    lastUpdated: "Last updated",
  };

  if (!user) return null;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">{wt.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-white relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">{wt.balance}</p>
                    <p className="text-4xl font-bold">${wallet?.balance.toFixed(2) || "0.00"}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs">{wallet?.currency || "USD"}</p>
                  </div>
                  <Button
                    onClick={() => setShowTopupModal(true)}
                    className="bg-white text-primary hover:bg-white/90 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {wt.topup}
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{wt.totalCredits}</p>
                    <p className="text-lg font-semibold text-foreground">
                      ${wallet?.totalCredits.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{wt.totalDebits}</p>
                    <p className="text-lg font-semibold text-foreground">
                      ${wallet?.totalDebits.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button
                onClick={() => setShowTopupModal(true)}
                className="w-full justify-start cursor-pointer"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-3" />
                Add Funds
              </Button>
              <Link href="/my-requests">
                <Button className="w-full justify-start cursor-pointer bg-transparent" variant="outline">
                  <History className="w-4 h-4 mr-3" />
                  View Requests
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              {wt.transactions}
            </h2>
          </div>

          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">{wt.noTransactions}</p>
              </div>
            ) : (
              <>
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        {getTransactionIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tx.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {new Date(tx.createdAt).toLocaleDateString(locale, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          {tx.request && (
                            <>
                              <span>•</span>
                              <Link
                                href={`/request/${tx.request.id}`}
                                className="text-primary hover:underline"
                              >
                                {tx.request.publicId}
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          tx.type === "credit" || tx.type === "topup" || tx.type === "refund"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {tx.type === "credit" || tx.type === "topup" || tx.type === "refund" ? "+" : "-"}$
                        {tx.amount.toFixed(2)}
                      </p>
                      {getStatusBadge(tx.status)}
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <div className="p-4">
                    <Button
                      onClick={fetchMoreTransactions}
                      disabled={loadingMore}
                      variant="ghost"
                      className="w-full cursor-pointer"
                    >
                      {loadingMore ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-2" />
                      )}
                      {wt.loadMore}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Topup Modal */}
        {showTopupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{wt.topupWallet}</h3>
                  <p className="text-sm text-muted-foreground">{wt.enterAmount}</p>
                </div>
              </div>

              {/* Quick Amounts */}
              <div className="mb-6">
                <p className="text-sm font-medium text-foreground mb-3">{wt.quickAmounts}</p>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTopupAmount(amount)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                        topupAmount === amount
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div className="mb-6">
                <p className="text-sm font-medium text-foreground mb-2">{wt.customAmount}</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">$</span>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary text-lg"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowTopupModal(false)}
                  variant="outline"
                  className="flex-1 bg-transparent cursor-pointer"
                  disabled={topupLoading}
                >
                  {wt.cancel}
                </Button>
                <Button
                  onClick={handleTopup}
                  className="flex-1 cursor-pointer"
                  disabled={topupLoading || topupAmount < 1}
                >
                  {topupLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4 mr-2" />
                  )}
                  {wt.proceedToPayment}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <WalletContent />
    </Suspense>
  );
}
