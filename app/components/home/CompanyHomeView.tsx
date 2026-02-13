"use client";

import { useRouter } from "next/navigation";
import { Package, Truck, Users } from "lucide-react";

export function CompanyHomeView() {
  const router = useRouter();

  const companyCards = [
    {
      icon: Package,
      title: "My Requests",
      description: "View all your shipping requests",
      color: "bg-blue-100 dark:bg-blue-900/20",
      iconColor: "text-blue-600",
      onClick: () => router.push("/company/requests"),
    },
    {
      icon: Truck,
      title: "Ongoing Shipments",
      description: "Track active shipments in real-time",
      color: "bg-green-100 dark:bg-green-900/20",
      iconColor: "text-green-600",
      onClick: () => router.push("/company/ongoing"),
    },
    {
      icon: Package,
      title: "Warehouses",
      description: "Manage warehouse locations and inventory",
      color: "bg-purple-100 dark:bg-purple-900/20",
      iconColor: "text-purple-600",
      onClick: () => router.push("/company/warehouses"),
    },
    {
      icon: Users,
      title: "Messages",
      description: "Communicate with partners and clients",
      color: "bg-orange-100 dark:bg-orange-900/20",
      iconColor: "text-orange-600",
      onClick: () => router.push("/company/inbox"),
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Company Dashboard
        </h1>
        <p className="text-muted-foreground mb-12">
          Manage your shipping operations
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {companyCards.map((card, index) => {
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
