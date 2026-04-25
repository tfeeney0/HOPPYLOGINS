import type { Metadata } from "next";
import { LegalShell } from "@/app/(marketing)/components/legal-shell";

export const metadata: Metadata = {
  title: "Términos y Condiciones"
};

export default function TerminosPage() {
  return (
    <LegalShell
      title="Términos y Condiciones"
      subtitle="Estas condiciones regulan el uso de HoppyLogins como servicio de gestión de accesos para organizaciones."
    >
      <h2>Alcance del Servicio</h2>
      <p>
        HoppyLogins ofrece una infraestructura B2B para centralizar correos
        transaccionales y delegar accesos operativos de forma controlada dentro de
        equipos de trabajo.
      </p>

      <h2>Uso Aceptable</h2>
      <p>
        HoppyLogins es una herramienta B2B para la gestión de equipos. Queda
        estrictamente prohibido el uso de este servicio para la creación automatizada
        de cuentas, spam, o cualquier actividad que viole los términos de servicio de
        plataformas de terceros (como Meta/Instagram).
      </p>

      <h2>Terminación de Servicio</h2>
      <p>
        Nos reservamos el derecho de suspender inmediatamente cualquier cuenta que
        utilice nuestros webhooks para recibir spam o tráfico no solicitado.
      </p>

      <h2>Actualizaciones</h2>
      <p>
        Podemos actualizar estos términos para reflejar cambios regulatorios,
        funcionales o de seguridad. El uso continuado del servicio implica la
        aceptación de la versión vigente.
      </p>
    </LegalShell>
  );
}
