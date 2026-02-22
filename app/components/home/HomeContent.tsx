"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useHomeView } from "@/app/hooks/useHomeView";
import { Loader2 } from "lucide-react";

export function HomeContent() {
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  const HomeViewComponent = useHomeView(user);

  return <HomeViewComponent />;
}
