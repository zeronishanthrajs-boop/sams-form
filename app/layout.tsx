import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "NAAC Event Report Generator | Official Institutional Portal",
  description:
    "Standardized institutional event report generator for faculty members. Enter event details, attach photos, and automatically generate and email NAAC-compliant PDF reports.",
  keywords: [
    "NAAC",
    "Event Report Generator",
    "College Event Documentation",
    "Faculty Report Form",
    "PDF Generator",
  ],
  authors: [{ name: "Institutional NAAC Documentation Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}
