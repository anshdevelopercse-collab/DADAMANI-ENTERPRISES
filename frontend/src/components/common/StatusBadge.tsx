import React from 'react';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';

  if (['active', 'awarded', 'completed', 'approved', 'paid', 'success'].includes(normalized)) {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  } else if (['submitted', 'in progress', 'assigned', 'sent', 'on track'].includes(normalized)) {
    colorClasses = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
  } else if (['draft', 'pending', 'pending kickoff', 'pending review'].includes(normalized)) {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  } else if (['rejected', 'cancelled', 'document expired', 'failure', 'terminated', 'emergency'].includes(normalized)) {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  } else if (['maintenance', 'high', 'delayed'].includes(normalized)) {
    colorClasses = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium border rounded-full font-mono',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        colorClasses
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
};
