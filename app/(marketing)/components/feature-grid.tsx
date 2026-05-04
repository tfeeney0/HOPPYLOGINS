type Feature = {
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    title: "Centralized Control",
    description:
      "One unified dashboard to manage all verification emails across your agency."
  },
  {
    title: "Granular Temporary Access",
    description:
      "Grant read access with expiration dates and revoke permissions in one click."
  },
  {
    title: "Enterprise Security",
    description:
      "Your data is protected with PostgreSQL RLS. Master credentials are never exposed."
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
