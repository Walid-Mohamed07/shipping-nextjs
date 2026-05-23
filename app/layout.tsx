import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { RealTimeProvider } from "./context/RealTimeContext";
import { LocaleProvider } from "./context/LocaleContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { Footer } from "./components/Footer";
import "./globals.css";
import { Header } from "./components/Header";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "ShipHub – Global Shipping Made Easy",
  description:
    "Fast and reliable shipping services worldwide. Simplify your logistics operations with our smart assignment and tracking system.",
  keywords:
    "shipping, logistics, delivery, tracking, freight, global shipping, supply chain",
  authors: [{ name: "ShipHub" }],
  creator: "ShipHub",
  publisher: "ShipHub",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shiphub.app",
    siteName: "ShipHub",
    title: "ShipHub – Global Shipping Made Easy",
    description:
      "Fast and reliable shipping services worldwide.",
    images: [
      {
        url: "/ShipHub logo icon.png",
        width: 1200,
        height: 630,
        alt: "ShipHub Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ShipHub – Global Shipping Made Easy",
    description:
      "Fast and reliable shipping services worldwide.",
    images: ["/ShipHub logo icon.png"],
  },
  icons: {
    icon: "/ShipHub logo icon.png",
    apple: "/ShipHub logo icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased flex flex-col min-h-screen">
        <LocaleProvider>
          <AuthProvider>
            <CurrencyProvider>
              <RealTimeProvider>
                <Header />
                {children}
                <Footer />
              </RealTimeProvider>
            </CurrencyProvider>
          </AuthProvider>
        </LocaleProvider>
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  );
}