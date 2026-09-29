import React from 'react';
import { useFirm } from '../../contexts/FirmContext';
import type { FirmField } from '../../types';

const COLORS = [
  'bg-sky-500/15 text-sky-300 border-sky-500/30',
  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'bg-violet-500/15 text-violet-300 border-violet-500/30',
  'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
];

export function useFirmColor(firmId: string | undefined): string {
  const { firms } = useFirm();
  if (!firmId) return 'bg-slate-700/50 text-slate-400 border-slate-600/30';
  const idx = firms.findIndex((f) => f._id === firmId);
  return COLORS[idx >= 0 ? idx % COLORS.length : 0];
}

interface FirmBadgeProps {
  firm?: FirmField;
  size?: 'sm' | 'md';
}

export const FirmBadge: React.FC<FirmBadgeProps> = ({ firm, size = 'sm' }) => {
  const { firms } = useFirm();

  if (!firm) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border bg-slate-700/40 text-slate-500 border-slate-700/50">
        No firm
      </span>
    );
  }

  const id = typeof firm === 'string' ? firm : firm._id;
  const name = typeof firm === 'string' ? (firms.find((f) => f._id === firm)?.name ?? '?') : firm.name;
  const code = typeof firm === 'string' ? (firms.find((f) => f._id === firm)?.code ?? '?') : (firm as any).code;
  const colorCls = useFirmColor(id);

  const label = size === 'sm' ? (code || name.slice(0, 4)) : name;
  const title = name;

  return (
    <span title={title} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${colorCls}`}>
      {label}
    </span>
  );
};

interface FirmBadgesProps {
  firms?: FirmField[];
}

export const FirmBadges: React.FC<FirmBadgesProps> = ({ firms }) => {
  if (!firms?.length) return <FirmBadge />;
  return (
    <div className="flex flex-wrap gap-1">
      {firms.map((f, i) => <FirmBadge key={i} firm={f} />)}
    </div>
  );
};
