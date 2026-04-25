import type { Metadata } from "next";
import { LegalShell } from "@/app/(marketing)/components/legal-shell";

export const metadata: Metadata = {
  title: "Política de Privacidad"
};

export default function PrivacidadPage() {
  return (
    <LegalShell
      title="Política de Privacidad"
      subtitle="Esta política describe cómo tratamos la información procesada en nuestra plataforma B2B."
    >
      <h2>Datos Procesados</h2>
      <p>
        Procesamos la información mínima necesaria para que los equipos autorizados
        puedan visualizar correos de verificación y operar de forma segura.
      </p>

      <h2>Retención de Datos</h2>
      <p>
        Los correos transaccionales procesados por nuestra infraestructura se almacenan
        de forma segura temporalmente para la lectura del equipo autorizado y pueden
        ser purgados por el administrador.
      </p>

      <h2>Seguridad</h2>
      <p>
        Utilizamos autenticación de base de datos a nivel de fila (RLS) para
        garantizar que los datos estén aislados por inquilino (tenant).
      </p>

      <h2>Contacto</h2>
      <p>
        Para dudas sobre privacidad y cumplimiento, el administrador de la cuenta
        puede contactar al equipo de soporte por los canales oficiales de HoppyLogins.
      </p>
    </LegalShell>
  );
}
