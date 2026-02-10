"use client";

import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { MessageNotification } from "./MessageNotification";

export function Header() {
  const { user, logout } = useAuth();

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
          {user ? (
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
              <span className="text-muted-foreground text-sm">
                {user.name} ({user.role})
              </span>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
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
