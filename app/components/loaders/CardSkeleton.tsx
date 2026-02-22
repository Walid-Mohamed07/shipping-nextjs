import React from "react";
import { Skeleton } from "./Skeleton";

interface CardSkeletonProps {
  count?: number;
  variant?: "minimal" | "detailed" | "full";
  className?: string;
}

/**
 * Card Skeleton Component
 * Shows loading skeletons for card-based layouts
 */
export function CardSkeleton({
  count = 3,
  variant = "detailed",
  className = "",
}: CardSkeletonProps) {
  const renderCard = () => {
    switch (variant) {
      case "minimal":
        return (
          <div className="border border-border rounded-lg p-4 space-y-3">
            <Skeleton className="w-full h-6" />
            <Skeleton className="w-2/3 h-4" />
          </div>
        );

      case "detailed":
        return (
          <div className="border border-border rounded-lg overflow-hidden">
            <Skeleton className="w-full h-40" />
            <div className="p-4 space-y-3">
              <Skeleton className="w-full h-5" />
              <Skeleton className="w-4/5 h-4" />
              <Skeleton className="w-3/5 h-4" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="w-20 h-8" />
                <Skeleton className="w-20 h-8" />
              </div>
            </div>
          </div>
        );

      case "full":
        return (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-skeleton/50 h-48" />
            <div className="p-4 space-y-4">
              <div>
                <Skeleton className="w-full h-6 mb-2" />
                <Skeleton className="w-full h-4 mb-2" />
                <Skeleton className="w-3/4 h-4" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="flex-1 h-10" />
                <Skeleton className="flex-1 h-10" />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={`card-skeleton-${idx}`}>{renderCard()}</div>
      ))}
    </div>
  );
}
