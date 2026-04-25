type Feature = {
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    title: "Control Centralizado",
    description:
      "Un solo panel para administrar todos los correos de verificación de tu agencia."
  },
  {
    title: "Accesos Granulares y Temporales",
    description:
      "Otorga permisos de lectura con fecha de caducidad. Revoca el acceso con un clic."
  },
  {
    title: "Seguridad Enterprise",
    description:
      "Tus datos protegidos por PostgreSQL RLS. Nunca exponemos credenciales maestras."
  }
];

export function FeatureGrid() {
  return (
    <section id="caracteristicas" className="px-4 pb-12 sm:px-6 sm:pb-16">
      <div className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">{feature.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              {feature.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
