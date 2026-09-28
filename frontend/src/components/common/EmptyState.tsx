import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/** Consistent "nothing here yet" state — replaces ad hoc empty-table messages scattered per page. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6">
    <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-slate-500" />
    </div>
    <h3 className="text-base font-semibold text-slate-200">{title}</h3>
    {description && <p className="text-sm text-slate-400 mt-1.5 max-w-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
