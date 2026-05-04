type PricingPlan = {
  name: string;
  price: string;
  detail: string;
  description: string;
};

const plans: PricingPlan[] = [
  {
    name: "Freelancer",
    price: "Free",
    detail: "Limited to 5 rules",
    description: "Ideal for solo operations and occasional client workflows."
  },
  {
    name: "Agency",
    price: "Contact Sales",
    detail: "Unlimited rules",
    description: "Built for teams managing multiple accounts and scalable workflows."
  }
];

export function Pricing() {
  return (
    <section className="px-4 pb-14 sm:px-6 sm:pb-20">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Plans for every stage of your agency
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Commercial mockup to evaluate operational fit in B2B environments.
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
