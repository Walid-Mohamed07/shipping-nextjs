import React from "react";
import { Skeleton } from "./Skeleton";

interface RequestCardSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Request Card Skeleton Component
 * Shows loading skeleton for request/shipment cards
 */
export function RequestCardSkeleton({
  count = 3,
  className = "",
}: RequestCardSkeletonProps) {
  const renderRequestCard = () => (
    <div className="border border-border rounded-lg p-4 space-y-4">
      {/* Header with ID and status */}
      <div className="flex justify-between items-start">
        <Skeleton className="w-1/3 h-5" />
        <Skeleton className="w-1/4 h-6" />
      </div>

      {/* From/To locations */}
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="w-1/2 h-4" />
            <Skeleton className="w-3/4 h-3" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Skeleton className="w-5 h-5 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="w-1/2 h-4" />
            <Skeleton className="w-3/4 h-3" />
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-full h-4" />
        </div>
        <div className="space-y-1">
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-full h-4" />
        </div>
        <div className="space-y-1">
          <Skeleton className="w-full h-3" />
          <Skeleton className="w-full h-4" />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 pt-2">
        <Skeleton className="flex-1 h-9" />
        <Skeleton className="flex-1 h-9" />
      </div>
    </div>
  );

  return (
    <div
      className={`grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={`request-skeleton-${idx}`}>{renderRequestCard()}</div>
      ))}
    </div>
  );
}
