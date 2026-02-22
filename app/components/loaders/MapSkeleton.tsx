import React from "react";
import { Skeleton } from "./Skeleton";

interface MapSkeletonProps {
  height?: string;
  className?: string;
}

/**
 * Map Skeleton Component
 * Shows loading skeleton for map components
 */
export function MapSkeleton({
  height = "h-96",
  className = "",
}: MapSkeletonProps) {
  return (
    <div
      className={`w-full ${height} rounded-lg border border-border bg-skeleton/50 flex items-center justify-center ${className}`}
      role="status"
      aria-label="Map loading..."
    >
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-24 h-3" />
      </div>
    </div>
  );
}
