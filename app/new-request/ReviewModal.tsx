"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  MapPin,
  Truck,
  Wrench,
  BoxSelect,
  MessageSquare,
  Clock,
  Phone,
  DollarSign,
  X,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import type { Item, Address } from "@/types";

export interface ReviewData {
  items: Item[];
  sourceAddress: Address | null;
  destinationAddress: Address | null;
  sourcePickupMode: string;
  destPickupMode: string;
  deliveryType: "Normal" | "Urgent";
  whenToStart: string;
  mobile: string;
  primaryCost: string;
  comments: string;
}

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: ReviewData;
  isLoading: boolean;
}

const formatAddress = (addr: Address | null) => {
  if (!addr) return "Not selected";
  const parts = [
    addr.street,
    addr.building,
    addr.district,
    addr.city,
    addr.governorate,
    addr.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Not selected";
};

export default function ReviewModal({
  open,
  onClose,
  onConfirm,
  data,
  isLoading,
}: ReviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Review Your Order
              </h2>
              <p className="text-sm text-muted-foreground">
                Please confirm all details before submitting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Items Section */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-primary" />
              Shipment Items ({data.items.length})
            </h3>
            <div className="space-y-2">
              {data.items.map((item, idx) => (
                <div
                  key={item._id || idx}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {item.name}
                      </span>
                      <Badge variant="secondary" className="text-[11px]">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.dimensions} · {item.weight} kg · ×{item.quantity}
                    </p>
                    {item.note && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        Note: {item.note}
                      </p>
                    )}
                    {item.services &&
                      (item.services.canBeAssembledDisassembled ||
                        item.services.assemblyDisassembly ||
                        item.services.packaging) && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(item.services.canBeAssembledDisassembled ||
                            item.services.assemblyDisassembly) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Wrench className="w-2.5 h-2.5" />
                              Assembly
                              {item.services.assemblyDisassemblyHandler && (
                                <span className="ml-0.5">
                                  (
                                  {item.services.assemblyDisassemblyHandler ===
                                  "self"
                                    ? "Self"
                                    : "Company"}
                                  )
                                </span>
                              )}
                            </span>
                          )}
                          {item.services.packaging && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <BoxSelect className="w-2.5 h-2.5" />
                              Packaging
                            </span>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Addresses Section */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-primary" />
              Addresses
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Pickup (Source)
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatAddress(data.sourceAddress)}
                </p>
                {data.sourceAddress?.fullName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.sourceAddress.fullName}
                  </p>
                )}
                {data.sourceAddress?.mobile && (
                  <p className="text-xs text-muted-foreground">
                    {data.sourceAddress.mobile}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Mode: {data.sourcePickupMode}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Delivery (Destination)
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatAddress(data.destinationAddress)}
                </p>
                {data.destinationAddress?.fullName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.destinationAddress.fullName}
                  </p>
                )}
                {data.destinationAddress?.mobile && (
                  <p className="text-xs text-muted-foreground">
                    {data.destinationAddress.mobile}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Mode: {data.destPickupMode}
                </p>
              </div>
            </div>
          </section>

          {/* Delivery & Cost Section */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-primary" />
              Delivery &amp; Cost
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Delivery Type
                </p>
                <p className="text-sm font-medium text-foreground">
                  {data.deliveryType === "Urgent" ? "🔥 Urgent" : "Normal"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Cost
                </p>
                <p className="text-sm font-bold text-primary flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {data.primaryCost ? data.primaryCost : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Start Date
                </p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {data.whenToStart
                    ? new Date(data.whenToStart).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Contact
                </p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {data.mobile || "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Comments Section */}
          {data.comments && (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-primary" />
                Additional Notes
              </h3>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {data.comments}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border px-6 py-4 bg-muted/30 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 cursor-pointer gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back &amp; Edit
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Confirm &amp; Submit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
