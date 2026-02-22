"use client";

import { useEffect, useState } from "react";
import { Header } from "@/app/components/Header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/context/AuthContext";
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";
import { toast, Toaster } from "sonner";
import { ArrowLeft, MapPin, Trash2, Plus, Edit2 } from "lucide-react";
import Link from "next/link";

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
  countryCode?: string;
  addressType: string;
  primary?: boolean;
  deliveryInstructions?: string;
}

export default function AddressesPage() {
  const { user, isLoading: authLoading } = useProtectedRoute();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    fetchAddresses();
  }, [user, authLoading]);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/user/addresses?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch addresses");
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch addresses";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.id) return;

    try {
      setIsDeletingId(addressId);
      const response = await fetch("/api/user/addresses", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          addressId,
        }),
      });

      if (!response.ok) throw new Error("Failed to delete address");

      const data = await response.json();
      setAddresses(data.addresses || []);
      toast.success("Address deleted successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete address";
      toast.error(errorMessage);
    } finally {
      setIsDeletingId(null);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground">
              Manage Addresses
            </h1>
          </div>
          {/* <Link href="/new-request">
            <Button className="gap-2 cursor-pointer">
              <Plus className="w-4 h-4" />
              Add Address
            </Button>
          </Link> */}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : addresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div
                key={address._id}
                className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground mb-2">
                      {address.fullName}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                        {address.addressType}
                      </span>
                      {address.primary && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <div className="flex-1">
                      <p>{address.street}</p>
                      {address.building && <p>{address.building}</p>}
                      <p>
                        {address.city}, {address.district}
                      </p>
                      <p>
                        {address.postalCode}, {address.country}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p>
                      <strong className="text-foreground">Mobile:</strong>{" "}
                      {address.mobile}
                    </p>
                  </div>

                  {address.deliveryInstructions && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs">
                        <strong className="text-foreground">
                          Instructions:
                        </strong>
                      </p>
                      <p className="text-xs italic">
                        {address.deliveryInstructions}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    disabled={isDeletingId === address._id}
                    onClick={() => handleDeleteAddress(address._id)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border p-12 text-center">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-lg text-muted-foreground mb-6">
              No addresses saved yet
            </p>
            <Link href="/new-request">
              <Button className="gap-2 cursor-pointer">
                <Plus className="w-4 h-4" />
                Add Your First Address
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
