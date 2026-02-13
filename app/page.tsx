"use client";

import { Header } from "./components/Header";
import { useAuth } from "@/app/context/AuthContext";
import { useHomeView } from "@/app/hooks/useHomeView";

export default function Home() {
  const { user } = useAuth();
  const HomeViewComponent = useHomeView(user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50 dark:to-slate-900">
      <Header />
      <HomeViewComponent />
    </div>
  );
}
