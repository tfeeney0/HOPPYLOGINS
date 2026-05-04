import type { Metadata } from "next";
import { LegalShell } from "@/app/(marketing)/components/legal-shell";

export const metadata: Metadata = {
  title: "Terms and Conditions"
};

export default function TerminosPage() {
  return (
    <LegalShell
      title="Terms and Conditions"
      subtitle="These terms govern the use of HoppyLogins as an access management service for organizations."
    >
      <h2>Service Scope</h2>
      <p>
        HoppyLogins provides B2B infrastructure to centralize transactional emails
        and delegate operational access in a controlled way across work teams.
      </p>

      <h2>Acceptable Use</h2>
      <p>
        HoppyLogins is a B2B team management tool. Using this service for automated
        account creation, spam, or any activity that violates third-party platform
        terms of service (such as Meta/Instagram) is strictly prohibited.
      </p>

      <h2>Service Termination</h2>
      <p>
        We reserve the right to immediately suspend any account that uses our
        webhooks to receive spam or unsolicited traffic.
      </p>

      <h2>Updates</h2>
      <p>
        We may update these terms to reflect regulatory, functional, or security
        changes. Continued use of the service constitutes acceptance of the current version.
      </p>
    </LegalShell>
  );
}
