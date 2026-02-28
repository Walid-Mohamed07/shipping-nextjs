"use client";

import { useRouter } from "next/navigation";
import { Package, BarChart3, ClipboardList, Clock } from "lucide-react";

export function OperatorHomeView() {
  const router = useRouter();

  const operatorCards = [
    {
      icon: Package,
      title: "Requests",
      description: "View and manage shipping requests",
      color: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
      onClick: () => router.push("/admin/dashboard/requests"),
    },
    {
      icon: BarChart3,
      title: "Metrics",
      description: "Track performance analytics",
      color: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600",
      onClick: () => router.push("/admin/dashboard/metrics"),
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Operator Dashboard
        </h1>
        <p className="text-muted-foreground mb-12">
          Manage requests and track performance
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {operatorCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-950 rounded-lg p-6 border border-border hover:border-primary transition-colors cursor-pointer"
                onClick={card.onClick}
              >
                <div
                  className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}
                >
                  <Icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
