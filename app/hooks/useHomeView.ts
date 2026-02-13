"use client";

import { User, UserRole } from "@/types";
import {
  ClientHomeView,
  AdminHomeView,
  OperatorHomeView,
  CompanyHomeView,
} from "@/app/components/home";

type HomeViewComponent = typeof ClientHomeView;

const viewMap: Record<UserRole | "guest", HomeViewComponent> = {
  client: ClientHomeView,
  admin: AdminHomeView,
  operator: OperatorHomeView,
  company: CompanyHomeView,
  driver: ClientHomeView, // drivers see the same as clients for now
  warehouse_manager: CompanyHomeView, // warehouse managers see company view
  guest: ClientHomeView,
};

export function useHomeView(user: User | null): HomeViewComponent {
  if (!user) {
    return viewMap.guest;
  }

  return viewMap[user.role] || viewMap.guest;
}

export function getHomeView(user: User | null): HomeViewComponent {
  if (!user) {
    return viewMap.guest;
  }

  return viewMap[user.role] || viewMap.guest;
}
