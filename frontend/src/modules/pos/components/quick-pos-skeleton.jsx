import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'

export function QuickPosSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Card className="space-y-4 rounded-[1.75rem] p-4">
        <Skeleton className="h-24 w-full rounded-[1.5rem]" />
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-12 w-24 rounded-full" />
          <Skeleton className="h-12 w-24 rounded-full" />
          <Skeleton className="h-12 w-24 rounded-full" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-3xl" />
          ))}
        </div>
      </Card>

      <Card className="space-y-4 rounded-[1.75rem] p-4">
        <Skeleton className="h-16 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-16 rounded-3xl" />
        <Skeleton className="h-16 rounded-3xl" />
      </Card>
    </div>
  )
}
