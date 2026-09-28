import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorScheme?: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorScheme = 'blue',
  onClick,
}) => {
  const glowMap = {
    blue: 'border-sky-500/20 hover:border-sky-500/40 text-sky-400 bg-sky-500/10',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
    amber: 'border-amber-500/20 hover:border-amber-500/40 text-amber-400 bg-amber-500/10',
    rose: 'border-rose-500/20 hover:border-rose-500/40 text-rose-400 bg-rose-500/10',
    indigo: 'border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 bg-indigo-500/10',
  };

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={clsx(
        'glass-card rounded-xl p-5 border transition-all duration-300 relative overflow-hidden',
        onClick && 'cursor-pointer',
        glowMap[colorScheme].split(' ').slice(0, 2).join(' ')
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1.5 tracking-tight">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={clsx('p-3 rounded-xl border border-white/5', glowMap[colorScheme])}>
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-xs">
          <span className={trend.isPositive ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-slate-500">vs last month</span>
        </div>
      )}
    </motion.div>
  );
};
