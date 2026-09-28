import React, { useState } from 'react';
import { X, FileSpreadsheet, FileText, Printer, CheckCircle, Loader2 } from 'lucide-react';
import { api, API_BASE_URL } from '../../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: 'tenders' | 'awarded' | 'vehicles' | 'work-orders' | 'audit-logs';
  title: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, moduleName, title }) => {
  const [format, setFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/import-export/export`, {
        params: { module: moduleName, format },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const extension = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      link.setAttribute('download', `${moduleName}_report_${Date.now()}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      onClose();
    } catch (error) {
      alert('Failed to generate export file. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-1">Export {title}</h3>
        <p className="text-xs text-slate-400 mb-6">Select your preferred export report format</p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setFormat('excel')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${
              format === 'excel'
                ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
            <span className="font-semibold text-sm">Excel (.xlsx)</span>
            <span className="text-[11px] text-slate-400">Styled workbook</span>
          </button>

          <button
            type="button"
            onClick={() => setFormat('pdf')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${
              format === 'pdf'
                ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <FileText className="w-8 h-8 text-rose-400" />
            <span className="font-semibold text-sm">PDF Document</span>
            <span className="text-[11px] text-slate-400">A4 Landscape Report</span>
          </button>

          <button
            type="button"
            onClick={() => setFormat('csv')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition ${
              format === 'csv'
                ? 'bg-sky-500/10 border-sky-500 text-sky-400'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <FileText className="w-8 h-8 text-amber-400" />
            <span className="font-semibold text-sm">CSV Plain</span>
            <span className="text-[11px] text-slate-400">Comma-separated</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-4 rounded-xl border bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 flex flex-col items-center gap-2 transition"
          >
            <Printer className="w-8 h-8 text-indigo-400" />
            <span className="font-semibold text-sm">Print View</span>
            <span className="text-[11px] text-slate-400">Direct printer</span>
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold shadow-lg shadow-sky-600/20 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Download Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
