"use client";

import { User, UserRole } from "@/types";
import {
  ClientHomeView,
  AdminHomeView,
  OperatorHomeView,
  DriverHomeView,
} from "@/app/components/home";

type HomeViewComponent = typeof ClientHomeView;

const viewMap: Record<UserRole | "guest", HomeViewComponent> = {
  client: ClientHomeView,
  admin: AdminHomeView,
  operator: OperatorHomeView,
  driver: DriverHomeView,
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
