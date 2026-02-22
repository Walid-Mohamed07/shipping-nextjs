import React from "react";
import { Skeleton } from "./Skeleton";

/**
 * Home Page Skeleton Component
 * Shows loading skeleton for the home page hero section and features
 */
export function HomePageSkeleton() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
      <div className="text-center">
        {/* Hero Title */}
        <div className="space-y-4 mb-8">
          <Skeleton className="w-full h-16 mx-auto max-w-2xl" />
          <Skeleton className="w-3/4 h-14 mx-auto" />
        </div>

        {/* Hero Description */}
        <div className="space-y-2 mb-8 max-w-2xl mx-auto">
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-2/3 h-6" />
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Skeleton className="w-full sm:w-32 h-12" />
          <Skeleton className="w-full sm:w-32 h-12" />
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[1, 2, 3].map((idx) => (
            <div
              key={`feature-skeleton-${idx}`}
              className="bg-white dark:bg-slate-950 rounded-lg p-8 border border-border"
            >
              {/* Icon placeholder */}
              <Skeleton className="w-12 h-12 rounded-lg mx-auto mb-4" />

              {/* Feature title */}
              <Skeleton className="w-3/4 h-6 mx-auto mb-3" />

              {/* Feature description */}
              <div className="space-y-2">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-2/3 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
