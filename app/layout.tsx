import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { themeBootstrapScript } from "@/app/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Your Renting Helper",
  description:
    "Score rental locations by everyday convenience: transport, groceries, food, health, fitness, and services nearby.",
};

// Matches --page in each theme so the mobile browser bar blends in.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1017" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-page text-ink">
        <ThemeProvider>{children}</ThemeProvider>
        <footer className="border-t border-line px-4 py-6 text-xs text-ink-muted sm:px-6 lg:px-8 print:hidden">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p>
              Scores are indicative only. Distances are straight-line estimates.
              Map and place data © Google.
            </p>
            <Link
              href="/how-it-works"
              className="focus-ring rounded font-medium hover:text-ink"
            >
              How it works
            </Link>
          </div>
        </footer>
        <Analytics />
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrapScript}
        </Script>
      </body>
    </html>
  );
}
