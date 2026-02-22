import React from "react";
import { Skeleton } from "./Skeleton";

interface FormSkeletonProps {
  fieldCount?: number;
  className?: string;
  showSubmit?: boolean;
}

/**
 * Form Skeleton Component
 * Shows loading skeletons for form fields
 */
export function FormSkeleton({
  fieldCount = 4,
  className = "",
  showSubmit = true,
}: FormSkeletonProps) {
  return (
    <div className={`w-full max-w-md space-y-4 ${className}`}>
      {/* Form fields */}
      {Array.from({ length: fieldCount }).map((_, idx) => (
        <div key={`field-${idx}`} className="space-y-2">
          <Skeleton className="w-1/3 h-4" /> {/* Label */}
          <Skeleton className="w-full h-10" /> {/* Input */}
        </div>
      ))}

      {/* Submit button */}
      {showSubmit && (
        <div className="pt-4">
          <Skeleton className="w-full h-10" />
        </div>
      )}
    </div>
  );
}
