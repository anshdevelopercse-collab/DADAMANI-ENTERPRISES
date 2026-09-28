import React, { useState, useEffect, useCallback } from 'react';
import {
  FileUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  Loader,
  Table2,
  RefreshCw,
  Info,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';

interface ImportRecord {
  _id: string;
  fileName: string;
  type: string;
  status: 'Processing' | 'Completed' | 'Failed';
  totalRows: number;
  successRows: number;
  errorRows: number;
  errors?: string[];
  createdAt: string;
  processedAt?: string;
}

const importTypes = [
  { value: 'tenders', label: 'Tenders', description: 'Import tender records from Excel', template: '/templates/tenders_template.xlsx' },
  { value: 'vehicles', label: 'Vehicles', description: 'Import vehicle fleet data from Excel', template: '/templates/vehicles_template.xlsx' },
  { value: 'awarded-tenders', label: 'Awarded Tenders', description: 'Import awarded contract records', template: '/templates/awarded_tenders_template.xlsx' },
  { value: 'work-orders', label: 'Work Orders', description: 'Import work order data from Excel', template: '/templates/work_orders_template.xlsx' },
];

const statusIcons: Record<string, React.ReactNode> = {
  Processing: <Loader className="w-4 h-4 text-amber-400 animate-spin" />,
  Completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  Failed: <AlertTriangle className="w-4 h-4 text-red-400" />,
};

const statusColors: Record<string, string> = {
  Processing: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Failed: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export const ExcelImportPage: React.FC = () => {
  const [selectedType, setSelectedType] = useState('tenders');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [expandedErrors, setExpandedErrors] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/import-export/history');
      setHistory(res.data.data?.importHistory || res.data.data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls'))) {
      setFile(dropped);
      setUploadResult(null);
    } else {
      alert('Only .xlsx or .xls files are supported.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', selectedType);
      const res = await api.post('/import-export/execute', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult({ success: true, message: res.data.message || 'Import successful', data: res.data.data });
      setFile(null);
      fetchHistory();
    } catch (err: any) {
      setUploadResult({
        success: false,
        message: err.response?.data?.message || 'Import failed. Please check your file format.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = async (templatePath: string, type: string) => {
    try {
      const res = await api.get(`/import-export/template/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_template.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Template download failed. Please contact administrator.');
    }
  };

  const selectedTypeInfo = importTypes.find((t) => t.value === selectedType);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Excel Data Import"
        subtitle="Bulk import enterprise data from Excel spreadsheets with validation and error reporting"
      >
        <button
          onClick={fetchHistory}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Upload Panel */}
        <div className="lg:col-span-3 space-y-5">
          {/* Type Selection */}
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Table2 className="w-5 h-5 text-sky-400" />
              Select Data Type
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {importTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                    selectedType === type.value
                      ? 'border-sky-500 bg-sky-500/10 text-white'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs mt-0.5 opacity-70">{type.description}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleDownloadTemplate(selectedTypeInfo?.template || '', selectedType)}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-sm transition-all"
            >
              <Download className="w-4 h-4" />
              Download {selectedTypeInfo?.label} Template
            </button>
          </div>

          {/* File Drop Zone */}
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-sky-400" />
              Upload File
            </h3>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer ${
                dragOver
                  ? 'border-sky-400 bg-sky-500/10'
                  : file
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
              }`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {file ? (
                <div>
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-slate-400 text-sm mt-1">
                    {(file.size / 1024).toFixed(1)} KB — Click to change
                  </p>
                </div>
              ) : (
                <div>
                  <FileUp className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-300 font-medium">Drag & drop your Excel file here</p>
                  <p className="text-slate-500 text-sm mt-1">or click to browse (.xlsx, .xls)</p>
                </div>
              )}
            </div>
            <input
              id="file-input"
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            {uploadResult && (
              <div
                className={`mt-4 rounded-xl px-4 py-3 text-sm border flex items-start gap-3 ${
                  uploadResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {uploadResult.success ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="font-medium">{uploadResult.message}</div>
                  {uploadResult.data && (
                    <div className="text-xs mt-1 opacity-80">
                      {uploadResult.data.successRows} rows imported
                      {uploadResult.data.errorRows > 0 && `, ${uploadResult.data.errorRows} errors`}
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="mt-4 w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing Import...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4" />
                  Start Import
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Info + History */}
        <div className="lg:col-span-2 space-y-5">
          {/* Instructions */}
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-sky-400" />
              Import Instructions
            </h3>
            <ol className="text-slate-400 text-sm space-y-2 list-decimal list-inside">
              <li>Select the data type you want to import</li>
              <li>Download the template file for that data type</li>
              <li>Fill in your data following the template format</li>
              <li>Upload the filled template file</li>
              <li>Review the import results and fix any errors</li>
            </ol>
            <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <div className="text-amber-300 text-xs font-medium flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Important
              </div>
              <p className="text-amber-200/70 text-xs">
                Do not modify column headers in the template. Date format: DD/MM/YYYY. Numbers
                should not include currency symbols.
              </p>
            </div>
          </div>

          {/* Import History */}
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-sky-400" />
              Import History
            </h3>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No import history yet</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {history.map((record) => (
                  <div
                    key={record._id}
                    className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {record.fileName}
                        </div>
                        <div className="text-slate-500 text-xs capitalize">{record.type}</div>
                      </div>
                      <span
                        className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${statusColors[record.status]}`}
                      >
                        {statusIcons[record.status]}
                        {record.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="text-emerald-400">✓ {record.successRows} success</span>
                      {record.errorRows > 0 && (
                        <span className="text-red-400">✗ {record.errorRows} errors</span>
                      )}
                      <span className="ml-auto text-slate-500">
                        {new Date(record.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    {record.errors && record.errors.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={() =>
                            setExpandedErrors(expandedErrors === record._id ? null : record._id)
                          }
                          className="text-xs text-red-400 flex items-center gap-1 hover:text-red-300 transition-colors"
                        >
                          {expandedErrors === record._id ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                          View {record.errors.length} errors
                        </button>
                        {expandedErrors === record._id && (
                          <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2 space-y-1 max-h-24 overflow-y-auto">
                            {record.errors.map((err, i) => (
                              <div key={i} className="text-red-300 text-xs">
                                {err}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
