import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ActuallyRedactPDF - True PDF Redaction That Actually Works",
  description: "The only PDF redaction tool that truly removes text. No hidden layers, no copy-paste exploits, no metadata leaks. Your redacted content is gone forever.",
  keywords: ["PDF redaction", "redact PDF", "remove text from PDF", "secure PDF", "HIPAA compliant", "legal redaction"],
  openGraph: {
    title: "ActuallyRedactPDF - True PDF Redaction That Actually Works",
    description: "The only PDF redaction tool that truly removes text. No hidden layers, no copy-paste exploits.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ActuallyRedactPDF",
    description: "The only PDF redaction tool that truly removes text.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased grain`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
