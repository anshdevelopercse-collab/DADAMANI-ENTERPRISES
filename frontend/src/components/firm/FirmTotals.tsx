import React from 'react';
import { FirmBadge } from './FirmBadge';
import type { FirmField } from '../../types';

export interface FirmRow {
  firm: FirmField;
  label?: string;
  total: number;
  count?: number;
}

interface FirmTotalsProps {
  rows: FirmRow[];
  combined?: number;
  currency?: string;
  title?: string;
}

const fmt = (n: number | undefined | null, currency = '₹') => {
  const num = typeof n === 'number' && !isNaN(n) ? n : 0;
  return `${currency}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const FirmTotals: React.FC<FirmTotalsProps> = ({ rows, combined, currency = '₹', title }) => {
  if (!rows || !rows.length) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      {title && (
        <div className="px-4 py-2.5 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </div>
      )}
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-800/60 last:border-0">
              <td className="px-4 py-2.5">
                <FirmBadge firm={row.firm} size="md" />
              </td>
              {row.count !== undefined && (
                <td className="px-4 py-2.5 text-slate-400 text-right text-xs">{row.count} records</td>
              )}
              <td className="px-4 py-2.5 text-slate-100 font-mono text-right font-medium">
                {fmt(row.total, currency)}
              </td>
            </tr>
          ))}
          {combined !== undefined && combined !== null && rows.length > 1 && (
            <tr className="bg-slate-800/30">
              <td className="px-4 py-2.5 text-xs font-semibold text-slate-300">Combined</td>
              <td className="px-4 py-2.5 text-slate-100 font-mono text-right font-semibold" colSpan={2}>
                {fmt(combined, currency)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
