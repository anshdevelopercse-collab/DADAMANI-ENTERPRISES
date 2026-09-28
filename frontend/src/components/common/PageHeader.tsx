import React, { useState } from 'react';
import { Download, Plus, Filter } from 'lucide-react';
import { ExportModal } from './ExportModal';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  moduleName?: 'tenders' | 'awarded' | 'vehicles' | 'work-orders' | 'audit-logs';
  onAddClick?: () => void;
  addLabel?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  moduleName,
  onAddClick,
  addLabel = 'Create New',
  children,
}) => {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {children}

        {moduleName && (
          <button
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export</span>
          </button>
        )}

        {onAddClick && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-medium text-sm shadow-lg shadow-sky-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{addLabel}</span>
          </button>
        )}
      </div>

      {moduleName && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          moduleName={moduleName}
          title={title}
        />
      )}
    </div>
  );
};
