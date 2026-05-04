import type { Metadata } from "next";
import { FeatureGrid } from "@/app/(marketing)/components/feature-grid";
import { Hero } from "@/app/(marketing)/components/hero";
import { Pricing } from "@/app/(marketing)/components/pricing";

export const metadata: Metadata = {
  title: "Secure B2B Access Management",
  description:
    "Platform for social media agencies that centralizes credentials and temporary access with enterprise-grade security.",
  openGraph: {
    title: "Secure B2B Access Management",
    description:
      "Platform for social media agencies that centralizes credentials and temporary access with enterprise-grade security.",
    url: "https://hoppylogins.com",
    siteName: "HoppyLogins",
    type: "website"
  }
};

export default function MarketingHomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Hero />
      <FeatureGrid />
      <Pricing />
    </div>
  );
}
