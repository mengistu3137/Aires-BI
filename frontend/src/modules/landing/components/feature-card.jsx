export function FeatureCard({ icon, title, description }) {
  const IconComponent = icon

  return (
    <article className="rounded-2xl border border-primary-100/70 bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-soft-xl">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
        <IconComponent className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
    </article>
  )
}
