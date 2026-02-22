"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: string | string[];
  fallback?: ReactNode;
}

/**
 * AuthGuard - Prevents rendering until auth is fully loaded
 * This prevents hydration mismatches by ensuring components only render
 * after the user state is confirmed on the client side
 */
export function AuthGuard({
  children,
  requiredRole,
  fallback,
}: AuthGuardProps) {
  const { user, isLoading } = useAuth();

  // Show loading while auth state is being determined
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )
    );
  }

  // Check if user is authenticated
  if (!user) {
    return null; // Will redirect in the page component
  }

  // Check if user has required role
  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];

    if (!requiredRoles.includes(user.role)) {
      return null; // Will redirect in the page component
    }
  }

  // Auth is complete and user is authenticated with proper role
  return <>{children}</>;
}
