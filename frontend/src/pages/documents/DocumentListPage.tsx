import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Download,
  Trash2,
  FileText,
  FileImage,
  File,
  Upload,
  Eye,
  Tag,
  User,
  X,
  History,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { Drawer } from '../../components/common/Drawer';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import { useAuth } from '../../contexts/AuthContext';

interface Document {
  _id: string;
  name: string;
  description?: string;
  type: 'Tender' | 'Contract' | 'Vehicle' | 'Compliance' | 'Invoice' | 'Report' | 'Other';
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  tags?: string[];
  expiryDate?: string;
  uploadedBy?: { name: string; email: string };
  // Version fields (may be absent for documents uploaded before versioning was added)
  versionNumber?: number;
  isLatestVersion?: boolean;
  parentDoc?: string;
  createdAt: string;
}

const docTypeColors: Record<string, string> = {
  Tender: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  Contract: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  Vehicle: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Compliance: 'text-red-400 bg-red-500/10 border-red-500/30',
  Invoice: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Report: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  Other: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

const getFileIcon = (mimeType: string) => {
  if (mimeType?.includes('image')) return <FileImage className="w-7 h-7 text-sky-400" />;
  if (mimeType?.includes('pdf')) return <FileText className="w-7 h-7 text-red-400" />;
  return <File className="w-7 h-7 text-slate-400" />;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface UploadModalProps { open: boolean; onClose: () => void; onUploaded: () => void; }

const UploadModal: React.FC<UploadModalProps> = ({ open, onClose, onUploaded }) => {
  const [form, setForm] = useState({ name: '', description: '', type: 'Other', tags: '', expiryDate: '' });
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (!open) { setForm({ name: '', description: '', type: 'Other', tags: '', expiryDate: '' }); setFile(null); setError(''); } }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    if (!form.name.trim()) { setError('Document name is required'); return; }
    setUploading(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(); onClose();
    } catch (err: any) { setError(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Upload Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{error}</div>}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); if (!form.name) setForm(prev => ({ ...prev, name: f.name.replace(/\.[^/.]+$/, '') })); } }}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-sky-400 bg-sky-500/10' : file ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-600 hover:border-slate-500'}`}
            onClick={() => document.getElementById('doc-upload-input')?.click()}
          >
            {file ? (
              <div>{getFileIcon(file.type)}<p className="text-white font-medium mt-2 text-sm">{file.name}</p><p className="text-slate-400 text-xs">{formatBytes(file.size)}</p></div>
            ) : (
              <div><Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" /><p className="text-slate-300 text-sm">Drop file or click to browse</p></div>
            )}
          </div>
          <input id="doc-upload-input" type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); if (!form.name) setForm(prev => ({ ...prev, name: f.name.replace(/\.[^/.]+$/, '') })); } }} />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Document Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm">
                {['Tender', 'Contract', 'Vehicle', 'Compliance', 'Invoice', 'Report', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Tags (comma separated)</label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
              placeholder="compliance, 2026, tender-ref" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-sm">Cancel</button>
            <button type="submit" disabled={uploading}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium transition-all text-sm disabled:opacity-60 flex items-center gap-2">
              {uploading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DocumentListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Version history drawer
  const [versionTarget, setVersionTarget] = useState<Document | null>(null);
  const [versions, setVersions] = useState<Document[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const openVersionHistory = async (doc: Document) => {
    setVersionTarget(doc);
    setVersionsLoading(true);
    try {
      const res = await api.get(`/documents/${doc._id}/versions`);
      setVersions(res.data?.data || []);
    } finally {
      setVersionsLoading(false);
    }
  };

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/documents', { params: { page, limit: 12, search, type: typeFilter } });
      const d = res.data.data;
      setDocuments(d.documents || d.data || []);
      setPagination({ total: d.pagination?.total || 0, totalPages: d.pagination?.totalPages || 1 });
    } catch { setDocuments([]); }
    finally { setLoading(false); }
  }, [page, search, typeFilter]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete document "${doc.name}"?`)) return;
    try { await api.delete(`/documents/${doc._id}`); fetchDocuments(); }
    catch { alert('Failed to delete document'); }
  };

  const isExpired = (d?: string) => d ? new Date(d).getTime() < Date.now() : false;
  const isExpiringSoon = (d?: string) => {
    if (!d) return false;
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days >= 0 && days <= 30;
  };

  const columns: Column<Document>[] = [
    {
      header: 'Document',
      cell: (doc) => (
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">{getFileIcon(doc.mimeType)}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-white font-medium text-sm truncate max-w-[140px]">{doc.name}</div>
              {doc.versionNumber && doc.versionNumber > 1 && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  v{doc.versionNumber}
                </span>
              )}
            </div>
            <div className="text-slate-500 text-xs truncate max-w-[160px]">{doc.fileName}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (doc) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${docTypeColors[doc.type] || docTypeColors['Other']}`}>
          {doc.type}
        </span>
      ),
    },
    {
      header: 'Size',
      cell: (doc) => <span className="text-slate-400 text-sm">{formatBytes(doc.fileSize)}</span>,
    },
    {
      header: 'Tags',
      cell: (doc) => (
        <div className="flex flex-wrap gap-1 max-w-[140px]">
          {(doc.tags || []).slice(0, 3).map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
              <Tag className="w-2.5 h-2.5" />{tag}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: 'Expiry',
      cell: (doc) => {
        if (!doc.expiryDate) return <span className="text-slate-600 text-sm">—</span>;
        const expired = isExpired(doc.expiryDate);
        const expiring = isExpiringSoon(doc.expiryDate);
        return (
          <div className={`text-sm ${expired ? 'text-red-400' : expiring ? 'text-amber-400' : 'text-slate-300'}`}>
            {new Date(doc.expiryDate).toLocaleDateString('en-IN')}
            {expired && <div className="text-xs font-medium">EXPIRED</div>}
            {!expired && expiring && <div className="text-xs">Expiring soon</div>}
          </div>
        );
      },
    },
    {
      header: 'Uploaded By',
      cell: (doc) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center">
            <User className="w-3 h-3 text-sky-400" />
          </div>
          <span className="text-slate-300 text-sm">{doc.uploadedBy?.name || 'System'}</span>
        </div>
      ),
    },
    {
      header: 'Date',
      cell: (doc) => <span className="text-slate-400 text-sm">{new Date(doc.createdAt).toLocaleDateString('en-IN')}</span>,
    },
    {
      header: 'Actions',
      cell: (doc) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => window.open(doc.fileUrl, '_blank')} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all" title="View"><Eye className="w-4 h-4" /></button>
          <button onClick={() => window.open(doc.fileUrl, '_blank')} className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" title="Download"><Download className="w-4 h-4" /></button>
          <button onClick={() => openVersionHistory(doc)} className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all" title="Version history"><History className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(doc)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Management"
        subtitle="Centralized repository for all enterprise documents, contracts, and compliance files"
        onAddClick={() => setUploadModalOpen(true)}
        addLabel="Upload Document"
      >
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400">
            <span className="text-amber-400 font-semibold">{documents.filter(d => isExpiringSoon(d.expiryDate)).length}</span> expiring soon &nbsp;|&nbsp;
            <span className="text-red-400 font-semibold">{documents.filter(d => isExpired(d.expiryDate)).length}</span> expired
          </div>
        </div>
      </PageHeader>

      <DataTable
        columns={columns}
        data={documents}
        loading={loading}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search documents..."
        pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        emptyMessage="No documents found. Upload your first document."
        filters={
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none">
            <option value="">All Types</option>
            {['Tender', 'Contract', 'Vehicle', 'Compliance', 'Invoice', 'Report', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        }
      />

      <UploadModal open={uploadModalOpen} onClose={() => setUploadModalOpen(false)} onUploaded={fetchDocuments} />

      {/* Version History Drawer */}
      <Drawer
        isOpen={!!versionTarget}
        onClose={() => setVersionTarget(null)}
        title={`${versionTarget?.name} — Version History`}
      >
        {versionsLoading ? (
          <SkeletonTableRows rows={3} columns={3} />
        ) : versions.length === 0 ? (
          <EmptyState title="No version history" description="This document has only one version. Upload a replacement to create version history." />
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v._id} className={`p-4 rounded-xl border ${v.isLatestVersion !== false ? 'border-sky-500/30 bg-sky-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon(v.mimeType)}
                    <div>
                      <div className="font-medium text-slate-100 text-sm">{v.name || v.fileName}</div>
                      <div className="text-xs text-slate-400">{formatBytes(v.fileSize)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.versionNumber && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${v.isLatestVersion !== false ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        v{v.versionNumber}
                      </span>
                    )}
                    {v.isLatestVersion !== false && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Current
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-3">
                  <span>Uploaded: {new Date(v.createdAt).toLocaleDateString('en-IN')}</span>
                  {v.uploadedBy && <span>By: {v.uploadedBy.name}</span>}
                </div>
                {v.fileUrl && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => window.open(v.fileUrl, '_blank')}
                      className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      View / Download
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 p-3 rounded-lg bg-slate-800/50 text-xs text-slate-400">
          To add a new version, use the "Replace" upload on the document. Previous versions are preserved and never deleted.
        </div>
      </Drawer>
    </div>
  );
};
