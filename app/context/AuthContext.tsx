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
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore user from localStorage on app initialization
    const restoreUser = async () => {
      try {
        console.log("AuthContext: Attempting to restore user from localStorage...");

        // First, try to get user from localStorage (faster)
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log("AuthContext: User restored from localStorage:", parsedUser);
          setUser(parsedUser);
          setIsLoading(false);
          return;
        }

        // If no user in localStorage, try to validate token with backend
        const response = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include", // Include HTTP-only cookie
          headers: {
            "Content-Type": "application/json",
          },
        });

        console.log(
          "AuthContext: /api/auth/me response status:",
          response.status,
        );

        if (response.ok) {
          const data = await response.json();
          console.log("AuthContext: User validated with backend:", data.user);
          setUser(data.user);
          // Restore to localStorage
          localStorage.setItem("user", JSON.stringify(data.user));
        } else {
          console.log(
            "AuthContext: Token is invalid or expired (status:",
            response.status,
            ")",
          );
          setUser(null);
          localStorage.removeItem("user");
        }
      } catch (error) {
        console.error("AuthContext: Failed to restore user:", error);
        setUser(null);
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    };

    restoreUser();
  }, []);

  const login = async (email: string, password: string) => {
    console.log("AuthContext: Login attempt for user:", email);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include", // Important: include cookies
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("AuthContext: Login failed:", error);
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    console.log("AuthContext: Login successful for user:", email);
    
    // Store full user data in localStorage
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    
    // Token is already set as HTTP-only cookie by the server
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
    console.log("AuthContext: Signup attempt for user:", email);

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
      credentials: "include", // Important: include cookies
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("AuthContext: Signup failed:", error);
      throw new Error(error.error || "Signup failed");
    }

    const data = await response.json();
    console.log("AuthContext: Signup successful for user:", email);
    
    // Store full user data in localStorage
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    
    // Token is already set as HTTP-only cookie by the server
  };

  const logout = () => {
    console.log("AuthContext: User logout initiated");
    setUser(null);
    localStorage.removeItem("user");
    removeCookie("user_token");
    // The HTTP-only cookie will be cleared by the server logout endpoint
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    })
      .then(() => console.log("AuthContext: Server-side logout completed"))
      .catch((err) => console.error("AuthContext: Logout error:", err));
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, signup, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
