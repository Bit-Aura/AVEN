import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClerkProvider } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerkSafe";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Career PathFinder",
  description: "AI-powered personalized learning path recommender",
};

const CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("your_clerk") &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("placeholder")
    ? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    : "pk_test_cHJpbWUtbXV0dC01NDUwLmNsZXJrLmFjY291bnRzLmRldiQ=";

/**
 * Enterprise-grade implementation of RootLayout.
 * Provides production-ready logic and seamless integration within the AVEN ecosystem.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      signInFallbackRedirectUrl="/learner"
      signUpFallbackRedirectUrl="/diagnostic"
    >
      <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
        <body className="bg-aven-base text-aven-text min-h-screen antialiased font-sans selection:bg-aven-primary/20">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
