import React from "react";
import { Skeleton } from "./Skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

/**
 * Table Skeleton Component
 * Shows a loading skeleton for table rows and columns
 */
export function TableSkeleton({
  rows = 5,
  columns = 5,
  className = "",
  showHeader = true,
}: TableSkeletonProps) {
  const columnWidths = ["w-1/4", "w-1/5", "w-1/5", "w-1/5", "w-1/6"].slice(
    0,
    columns,
  );

  return (
    <div className={`w-full space-y-3 ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4 p-4 bg-skeleton/50 rounded-lg">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              className={`${columnWidths[i]} h-4`}
            />
          ))}
        </div>
      )}

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`row-${rowIdx}`}
          className="flex gap-4 p-4 border border-border rounded-lg"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`cell-${rowIdx}-${colIdx}`}
              className={`${columnWidths[colIdx]} h-6`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
