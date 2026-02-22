import React from "react";
import { Skeleton } from "./Skeleton";

interface ListSkeletonProps {
  itemCount?: number;
  className?: string;
  variant?: "simple" | "detailed" | "avatar";
}

/**
 * List Skeleton Component
 * Shows loading skeletons for list items
 */
export function ListSkeleton({
  itemCount = 5,
  className = "",
  variant = "detailed",
}: ListSkeletonProps) {
  const renderItem = () => {
    switch (variant) {
      case "simple":
        return (
          <div className="border border-border rounded-lg p-3">
            <Skeleton className="w-3/4 h-4" />
          </div>
        );

      case "avatar":
        return (
          <div className="border border-border rounded-lg p-3 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="w-1/2 h-4" />
              <Skeleton className="w-2/3 h-3" />
            </div>
          </div>
        );

      case "detailed":
        return (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-1">
                <Skeleton className="w-1/2 h-5" />
                <Skeleton className="w-3/4 h-3" />
              </div>
              <Skeleton className="w-1/4 h-4" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="flex-1 h-8" />
              <Skeleton className="flex-1 h-8" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: itemCount }).map((_, idx) => (
        <div key={`list-skeleton-${idx}`}>{renderItem()}</div>
      ))}
    </div>
  );
}
