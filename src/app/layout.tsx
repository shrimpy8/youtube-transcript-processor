import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Only load when needed
});

export const metadata: Metadata = {
  title: "YouTube Podcast Transcript Processor",
  description: "Extract, process, and export YouTube podcast transcripts with advanced features including speaker detection, deduplication, and TXT export format.",
  keywords: ["YouTube", "transcript", "podcast", "captions", "subtitle", "export"],
  authors: [{ name: "YouTube Transcript Processor" }],
  openGraph: {
    title: "YouTube Podcast Transcript Processor",
    description: "Extract, process, and export YouTube podcast transcripts",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <Header />
          <main className="min-h-[calc(100vh-8rem)]">
            {children}
          </main>
          <Footer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
