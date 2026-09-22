import { cn } from '../../../utils/cn'

export function CategoryTabs({ categories = [], selectedCategoryId, onChange }) {
  const tabs = [{ id: 'ALL', name: 'All' }].concat(categories || [])

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((category) => {
        const isActive = selectedCategoryId === category.id

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={cn(
              'min-h-12 shrink-0 rounded-full px-4 text-sm font-semibold transition active:scale-[0.98]',
              isActive
                ? 'bg-primary-600 text-white shadow-soft'
                : 'border border-primary-100/70 bg-surface text-text-secondary',
            )}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
