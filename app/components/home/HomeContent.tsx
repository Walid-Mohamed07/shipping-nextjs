"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useHomeView } from "@/app/hooks/useHomeView";
import { HomePageSkeleton } from "@/app/components/loaders";

export function HomeContent() {
  const { user, isLoading } = useAuth();
  if (!user && isLoading) {
    return <HomePageSkeleton />;
  }
  const HomeViewComponent = useHomeView(user);

  return <HomeViewComponent />;
}
