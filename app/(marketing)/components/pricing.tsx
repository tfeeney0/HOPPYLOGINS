type PricingPlan = {
  name: string;
  price: string;
  detail: string;
  description: string;
};

const plans: PricingPlan[] = [
  {
    name: "Freelancer",
    price: "Gratis",
    detail: "Limitado a 5 reglas",
    description: "Ideal para operación individual y clientes puntuales."
  },
  {
    name: "Agency",
    price: "Contacto a ventas",
    detail: "Reglas ilimitadas",
    description: "Diseñado para equipos con múltiples cuentas y flujos escalables."
  }
];

export function Pricing() {
  return (
    <section className="px-4 pb-14 sm:px-6 sm:pb-20">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Planes para cada etapa de tu agencia
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Mockup comercial para evaluar el encaje operativo en entornos B2B.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-xl border border-border bg-slate-50 p-6">
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <p className="mt-4 text-xl font-semibold text-slate-900">{plan.price}</p>
              <p className="mt-1 text-sm font-medium text-accent">{plan.detail}</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
