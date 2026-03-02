import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { RealTimeProvider } from "./context/RealTimeContext";
import { LocaleProvider } from "./context/LocaleContext";
import { Footer } from "./components/Footer";
import "./globals.css";
import { Header } from "./components/Header";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const ibmPlexArabic = IBM_Plex_Sans_Arabic({ 
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-arabic"
});

export const metadata: Metadata = {
  title: "شيب هب - الشحن العالمي بسهولة",
  description:
    "خدمات شحن سريعة وموثوقة حول العالم. بسّط عملياتك اللوجستية مع نظامنا الذكي للتعيين والتتبع.",
  keywords: "شحن, لوجستيات, توصيل, تتبع, إدارة المستودعات, shipping, logistics, delivery, tracking, warehouse management",
  authors: [{ name: "ShipHub" }],
  creator: "ShipHub",
  publisher: "ShipHub",
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://shiphub.app",
    siteName: "شيب هب",
    title: "شيب هب - الشحن العالمي بسهولة",
    description: "خدمات شحن سريعة وموثوقة حول العالم",
    images: [
      {
        url: "/ShipHub logo icon.png",
        width: 1200,
        height: 630,
        alt: "شعار شيب هب",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "شيب هب - الشحن العالمي بسهولة",
    description: "خدمات شحن سريعة وموثوقة حول العالم",
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
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable} ${ibmPlexArabic.variable}`}>
      <body className={`font-sans antialiased flex flex-col min-h-screen`}>
        <LocaleProvider>
          <AuthProvider>
            <RealTimeProvider>
              <Header />
              {children}
              <Footer />
            </RealTimeProvider>
          </AuthProvider>
        </LocaleProvider>
        <Toaster position="top-left" richColors />
        <Analytics />
      </body>
    </html>
  );
}
