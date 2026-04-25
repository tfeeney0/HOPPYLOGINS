import type { Metadata } from "next";
import { FeatureGrid } from "@/app/(marketing)/components/feature-grid";
import { Hero } from "@/app/(marketing)/components/hero";
import { Pricing } from "@/app/(marketing)/components/pricing";

export const metadata: Metadata = {
  title: "Gestión Segura de Accesos B2B",
  description:
    "Plataforma para agencias de social media que centraliza credenciales y accesos temporales con seguridad enterprise.",
  openGraph: {
    title: "Gestión Segura de Accesos B2B",
    description:
      "Plataforma para agencias de social media que centraliza credenciales y accesos temporales con seguridad enterprise.",
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
