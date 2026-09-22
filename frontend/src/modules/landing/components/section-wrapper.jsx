import { cn } from '../../../utils/cn'

export function SectionWrapper({ id, title, subtitle, children, className = '' }) {
  return (
    <section
      id={id}
      className={cn('mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18', className)}
    >
      {(title || subtitle) && (
        <header className="mb-8 max-w-2xl">
          {title ? (
            <h2 className="text-3xl font-semibold text-text-primary sm:text-4xl">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="mt-3 text-sm text-text-secondary sm:text-base">{subtitle}</p>
          ) : null}
        </header>
      )}
      {children}
    </section>
  )
}
