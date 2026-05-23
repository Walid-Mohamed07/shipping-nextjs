"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  MapPin,
  Truck,
  MessageSquare,
  Clock,
  Phone,
  DollarSign,
  X,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import type { Item, Address, DayOfWeek } from "@/types";
import type { TransportVehicleType } from "@/constants/transportVehicles";
import { useTranslation } from "@/app/context/LocaleContext";
import { useCategoryLabel } from "@/app/hooks/useCategoryLabel";

export interface ReviewData {
  items: Item[];
  sourceAddress: Address | null;
  destinationAddress: Address | null;
  sourcePickupMode: string;
  destPickupMode: string;
  deliveryType: "Normal" | "Urgent" | "Scheduled";
  scheduledDate?: string;
  collectionAvailableDays: DayOfWeek[];
  deliveryAvailableDays: DayOfWeek[];
  mobile: string;
  primaryCost?: string; // TEMPORARILY HIDDEN - primaryCost (optional now)
  comments: string;
  itemMediaPreviewsMap?: Record<number, string[]>; // Preview URLs from uploaded files
  workersCount?: number;
  selectedVehicle?: TransportVehicleType | null;
  receiptFloorNumber?: string;
  needsWinchPickup?: boolean;
  deliveryFloorNumber?: string;
  needsWinchDropoff?: boolean;
}

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: ReviewData;
  isLoading: boolean;
}

const formatAddress = (addr: Address | null, notSelected: string) => {
  if (!addr) return notSelected;
  const parts = [
    addr.street,
    addr.building,
    addr.district,
    addr.city,
    addr.governorate,
    addr.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : notSelected;
};

export default function ReviewModal({
  open,
  onClose,
  onConfirm,
  data,
  isLoading,
}: ReviewModalProps) {
  const { t } = useTranslation();
  const { getCategoryLabel } = useCategoryLabel();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 h-full">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t.newRequest.reviewOrder}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.newRequest.confirmDetails}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            aria-label={t.common.close}
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
              {t.newRequest.shipmentItems} ({data.items.length})
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
                  {/* {item.media && item.media.length > 0 && ( */}
                  <div className="h-20 w-20 shrink-0 rounded-md overflow-hidden border border-border bg-muted/30">
                    <img
                      src={
                        data.itemMediaPreviewsMap?.[idx]?.[0] ||
                        item.media?.[0]?.url ||
                        "/assets/images/items/ShipHub_logo.png"
                      }
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {/* )} */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">
                        {item.name}
                      </span>
                      <Badge variant="secondary" className="text-[11px]">
                        {getCategoryLabel(item.category)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.weight} kg · ×{item.quantity}
                    </p>
                    {item.note && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        {t.newRequest.noteLabel} {item.note}
                      </p>
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
              {t.newRequest.addresses}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {t.newRequest.pickupSource}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatAddress(data.sourceAddress, t.newRequest.notSelected)}
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
                  {t.newRequest.mode}: {data.sourcePickupMode}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {t.newRequest.deliveryDestination}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatAddress(
                    data.destinationAddress,
                    t.newRequest.notSelected,
                  )}
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
                  {t.newRequest.mode}: {data.destPickupMode}
                </p>
              </div>
            </div>
          </section>

          {/* Delivery & Cost Section */}
          <section>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-primary" />
              {t.newRequest.deliveryCost}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {t.newRequest.deliveryType}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {data.deliveryType === "Urgent"
                    ? `⚡ ${t.newRequest.urgent}`
                    : data.deliveryType === "Scheduled"
                      ? `📅 ${t.newRequest.scheduledDelivery}`
                      : t.newRequest.normal}
                </p>
              </div>
              {data.deliveryType === "Scheduled" && data.scheduledDate && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {t.newRequest.scheduledFor}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(data.scheduledDate).toLocaleString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {t.newRequest.contact}
                </p>
                <p className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {data.mobile || "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Floor Numbers & Winch Section */}
          {(data.receiptFloorNumber || data.deliveryFloorNumber) && (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-primary" />
                {t.newRequest.floorAndWinch}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.receiptFloorNumber && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <span className="text-gray-400">🏢</span>
                      {t.newRequest.receiptFloorNumber}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {data.receiptFloorNumber === "0"
                        ? t.newRequest.groundFloor
                        : data.receiptFloorNumber}
                    </p>
                    {data.needsWinchPickup && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                        <span>🏗️</span> ✓ {t.newRequest.needsWinchPickup}
                      </p>
                    )}
                  </div>
                )}
                {data.deliveryFloorNumber && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <span className="text-gray-400">🏢</span>
                      {t.newRequest.deliveryFloorNumber}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {data.deliveryFloorNumber === "0"
                        ? t.newRequest.groundFloor
                        : data.deliveryFloorNumber}
                    </p>
                    {data.needsWinchDropoff && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-1">
                        <span>🏗️</span> ✓ {t.newRequest.needsWinchDropoff}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Workers & Vehicle Section */}
          {(data.workersCount && data.workersCount > 0) ||
          data.selectedVehicle ? (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-primary" />
                {t.newRequest.workersAndVehicle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.workersCount && data.workersCount > 0 ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {t.newRequest.addWorkers}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {data.workersCount}{" "}
                      {data.workersCount === 1
                        ? t.newRequest.worker
                        : t.newRequest.workers}
                    </p>
                  </div>
                ) : null}
                {data.selectedVehicle ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {t.newRequest.transportVehicle}
                    </p>
                    <p className="text-sm font-bold text-foreground">
                      {data.selectedVehicle.nameAr}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.selectedVehicle.nameEn}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.selectedVehicle.dimensions.length}m ×{" "}
                      {data.selectedVehicle.dimensions.width}m ×{" "}
                      {data.selectedVehicle.dimensions.height}m —{" "}
                      {t.newRequest.maxLoad}: {data.selectedVehicle.maxWeight}{" "}
                      {t.newRequest.kg}
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Comments Section */}
          {data.comments && (
            <section>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-primary" />
                {t.newRequest.additionalNotes}
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
            {t.newRequest.reviewGoBack}
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
                {t.newRequest.submitting}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {t.newRequest.reviewConfirmSubmit}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
