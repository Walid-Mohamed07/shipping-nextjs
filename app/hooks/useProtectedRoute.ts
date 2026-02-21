import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

/**
 * Custom hook to protect routes from unauthorized access
 * Waits for authentication loading to complete before redirecting
 * Prevents premature redirects while token is being verified
 */
export function useProtectedRoute(redirectTo: string = "/login") {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only check auth after loading is complete
    if (!isLoading && !user) {
      router.push(redirectTo);
    }
  }, [user, isLoading, router, redirectTo]);

  // Return loading state so pages can show a loading indicator if needed
  return { user, isLoading };
}
