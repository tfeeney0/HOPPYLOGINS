import type { Metadata } from "next";
import { LegalShell } from "@/app/(marketing)/components/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy"
};

export default function PrivacidadPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      subtitle="This policy explains how we process information within our B2B platform."
    >
      <h2>Processed Data</h2>
      <p>
        We process only the minimum data required for authorized teams to view
        verification emails and operate securely.
      </p>

      <h2>Data Retention</h2>
      <p>
        Transactional emails processed by our infrastructure are stored securely
        for temporary access by authorized teams and may be purged by administrators.
      </p>

      <h2>Security</h2>
      <p>
        We use row-level security (RLS) at the database layer to ensure tenant-level
        data isolation.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy and compliance inquiries, account administrators can contact
        the support team through HoppyLogins&apos; official channels.
      </p>
    </LegalShell>
  );
}
