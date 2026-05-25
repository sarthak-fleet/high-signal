import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AnalyticsProvider } from "@/components/posthog-provider";
import { SaaSMakerFeedback } from "@/components/saasmaker-feedback";
import { AuthNav } from "@/components/auth/AuthNav";
import { PrimaryNav } from "@/components/system/PrimaryNav";

export const metadata: Metadata = {
  title: "High Signal — signal intelligence",
  description:
    "Signal intelligence for mentions, communities, and markets. Extract what matters from noisy public information streams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased">
        <ClerkProvider>
          <AnalyticsProvider>
            <PrimaryNav />
            <AuthNav />
            {children}
            <SaaSMakerFeedback />
          </AnalyticsProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
