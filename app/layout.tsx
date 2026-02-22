import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { Footer } from "./components/Footer";
import "./globals.css";
import { Header } from "./components/Header";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ShipHub - Global Shipping Made Easy",
  description:
    "Fast and reliable shipping services worldwide. Streamline your logistics with our intelligent assignment and tracking system.",
  keywords: "shipping, logistics, delivery, tracking, warehouse management",
  authors: [{ name: "ShipHub" }],
  creator: "ShipHub",
  publisher: "ShipHub",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shiphub.app",
    siteName: "ShipHub",
    title: "ShipHub - Global Shipping Made Easy",
    description: "Fast and reliable shipping services worldwide",
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
    title: "ShipHub - Global Shipping Made Easy",
    description: "Fast and reliable shipping services worldwide",
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
    <html lang="en">
      <body className={`font-sans antialiased flex flex-col min-h-screen`}>
        <AuthProvider>
          <Header />
          {children}
          <Footer />
        </AuthProvider>
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  );
}
