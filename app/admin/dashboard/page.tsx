"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Header } from "@/app/components/Header";
import { AdminDashboardNav } from "@/app/components/AdminDashboardNav";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (
      !isLoading &&
      (!user || (user.role !== "admin" && user.role !== "operator"))
    ) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user || (user.role !== "admin" && user.role !== "operator")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="flex">
        {/* Sidebar */}
        <AdminDashboardNav userRole={user.role} isSticky={true} />

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Select a section from the sidebar to get started
            </p>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground mb-4">
              Welcome to the Admin Dashboard
            </p>
            <p className="text-sm text-muted-foreground">
              Use the navigation menu on the left to access different sections
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
