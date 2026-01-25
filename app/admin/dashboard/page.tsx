"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Header } from "@/app/components/Header";
import { AdminOrdersTab } from "@/app/components/AdminOrdersTab";
import { AdminAssignmentTab } from "@/app/components/AdminAssignmentTab";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orders" | "assignments">(
    "orders",
  );
  const [acceptedOrderIds, setAcceptedOrderIds] = useState<string[]>([]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage shipping orders and assignments
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setActiveTab("orders")}
            variant={activeTab === "orders" ? "default" : "outline"}
            className={
              "cursor-pointer" +
              (activeTab === "orders" ? "" : " bg-transparent")
            }
          >
            Order Management
          </Button>
          <Button
            onClick={() => setActiveTab("assignments")}
            variant={activeTab === "assignments" ? "default" : "outline"}
            className={
              "cursor-pointer" +
              (activeTab === "assignments" ? "" : " bg-transparent")
            }
          >
            Assign Orders
          </Button>
        </div>

        <Card className="p-6">
          {activeTab === "orders" && (
            <AdminOrdersTab
              onOrderAccepted={(orderId) => {
                setAcceptedOrderIds([...acceptedOrderIds, orderId]);
              }}
            />
          )}
          {activeTab === "assignments" && (
            <AdminAssignmentTab acceptedOrderIds={acceptedOrderIds} />
          )}
        </Card>
      </main>
    </div>
  );
}
