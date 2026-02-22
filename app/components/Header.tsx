"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, ChevronDown } from "lucide-react";
import Image from "next/image";
import { MessageNotification } from "./MessageNotification";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export function Header() {
  const { user, logout, isLoading } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showProfileMenu]);

  return (
    <header className="w-full bg-white dark:bg-slate-950 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/ShipHub_logo.png"
            alt="ShipHub Logo"
            width={60}
            height={60}
          />
          {/* <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div> */}
          {/* <span className="font-bold text-xl text-foreground">ShipHub</span> */}
        </Link>

        <nav className="flex items-center gap-6">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : user ? (
            <>
              {user.role === "client" && (
                <Link
                  href="/my-requests"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  My Requests
                </Link>
              )}
              {user.role === "admin" && (
                <Link
                  href="/admin/dashboard"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
              )}
              {user.role === "operator" && (
                <Link
                  href="/admin/dashboard"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
              )}
              {user.role === "company" && (
                <Link
                  href="/admin/dashboard"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
              )}
              {user.role === "driver" && (
                <Link
                  href="/driver/orders"
                  className="text-foreground hover:text-primary transition-colors"
                >
                  My Orders
                </Link>
              )}
              {user.role === "company" && (
                <>
                  <Link
                    href="/company/requests"
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Requests
                  </Link>
                  <Link
                    href="/company/ongoing"
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Ongoing
                  </Link>
                  <Link
                    href="/company/warehouses"
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    Warehouses
                  </Link>
                </>
              )}
              <MessageNotification />

              <span className="text-muted-foreground text-sm hidden sm:inline">
                {user.name} ({user.role})
              </span>
              {/* Profile Picture Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  aria-label="Profile menu"
                >
                  {user.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.name || "Profile"}
                      className="w-9 h-9 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-border">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 py-2">
                    <button
                      onClick={() => {
                        router.push("/profile");
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-muted transition-colors text-foreground"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => {
                        logout();
                        setShowProfileMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-muted transition-colors text-foreground"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-foreground hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link href="/signup">
                <Button size="sm" className="cursor-pointer">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
