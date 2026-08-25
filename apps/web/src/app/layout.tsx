import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ClerkProvider } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerkSafe";

export const metadata: Metadata = {
  title: "Career PathFinder",
  description: "AI-powered personalized learning path recommender",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasClerkKey = isClerkConfigured;

  const bodyContent = (
    <html lang="en">
      <body className="bg-background text-slate-100 min-h-screen antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );

  if (hasClerkKey) {
    return <ClerkProvider>{bodyContent}</ClerkProvider>;
  }

  return bodyContent;
}
