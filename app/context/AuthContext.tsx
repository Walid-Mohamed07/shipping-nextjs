"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { User } from "@/types";
// Cookie utility functions
// Simple Bearer token generator (for demo; use backend in production)
// JWT secret for demo (in production, use backend secret)
// No client-side JWT generation; token comes from backend

function decodeJWT(token: string): User | null {
  try {
    return jwtDecode<User>(token);
  } catch {
    return null;
  }
}
function setCookie(name: string, value: string, days: number) {
  if (typeof window === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name: string) {
  if (typeof window === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

function removeCookie(name: string) {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export interface AddressLocation {
  country: string;
  countryCode: string;
  fullName: string;
  mobile: string;
  street: string;
  building: string;
  city: string;
  district: string;
  governorate: string;
  postalCode: string;
  landmark: string;
  addressType: string;
  deliveryInstructions: string;
  primary: boolean;
}

// interface User {
//   id: string;
//   email: string;
//   name: string;
//   locations: AddressLocation[];
//   role: "client" | "admin" | "driver" | "operator" | "company";
// }

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    fullName: string,
    username: string,
    mobile: string,
    profilePicture: string,
    birthDate: string,
    address: any,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run on client
    if (typeof window !== "undefined") {
      const token = getCookie("user_token");
      if (token) {
        const decoded = decodeJWT(token);
        if (decoded) {
          setUser(decoded);
        }
      }
      setIsLoading(false);
    }
  }, []);

  // Only render children after hydration
  if (isLoading) {
    return null; // or a loading spinner
  }

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    setUser(data.user);
    // Store backend JWT in cookie
    if (data.token) {
      setCookie("user_token", data.token, 7);
    }
  };

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    username: string,
    mobile: string,
    profilePicture: string,
    birthDate: string,
    address: any,
  ) => {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        fullName,
        username,
        mobile,
        profilePicture,
        birthDate,
        address,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Signup failed");
    }

    const data = await response.json();
    setUser(data.user);
    // Store backend JWT in cookie
    if (data.token) {
      setCookie("user_token", data.token, 7);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    removeCookie("user_token");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  // Get JWT from cookie and decode user context
  const token = getCookie("user_token");
  let jwtUser: User | null = null;
  if (token) {
    jwtUser = decodeJWT(token);
  }
  // Return context with user from JWT if available
  return { ...context, user: jwtUser ?? context.user };
}
