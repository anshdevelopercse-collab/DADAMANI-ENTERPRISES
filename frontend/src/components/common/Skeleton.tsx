import React from 'react';
import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={clsx('animate-pulse rounded-lg bg-slate-800/70', className)} />
);

/** Row-shaped skeleton matching DataTable's default row height, for list pages loading state. */
export const SkeletonTableRows: React.FC<{ rows?: number; columns?: number }> = ({ rows = 6, columns = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex items-center gap-4 px-4 py-3 border-b border-slate-800/60">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} className={clsx('h-4', c === 0 ? 'w-32' : 'flex-1')} />
        ))}
      </div>
    ))}
  </div>
);
