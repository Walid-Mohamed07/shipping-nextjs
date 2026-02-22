import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "circular" | "text";
}

/**
 * Base Skeleton Component
 * A reusable skeleton placeholder for loading states
 */
export function Skeleton({
  className = "w-full h-12",
  variant = "default",
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-skeleton rounded";

  const variantClasses = {
    default: "rounded",
    circular: "rounded-full",
    text: "rounded h-4",
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      role="status"
      aria-label="Loading..."
    />
  );
}
