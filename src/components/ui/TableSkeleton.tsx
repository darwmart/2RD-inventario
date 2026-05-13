import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  rows?: number;
  cols?: number;
}

export default function TableSkeleton({ rows = 6, cols = 5 }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
