import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Search,
  Eye,
  Download,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Info,
  Activity,
} from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';

interface AuditLog {
  _id: string;
  user?: { name: string; email: string };
  userName?: string;
  userRole?: string;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  changes?: Record<string, { before: any; after: any }>;
  ipAddress?: string;
  userAgent?: string;
  status: 'Success' | 'Failed' | 'Warning';
  createdAt: string;
}

const actionColors: Record<string, string> = {
  CREATE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  UPDATE: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  DELETE: 'text-red-400 bg-red-500/10 border-red-500/30',
  LOGIN: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  LOGOUT: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
  EXPORT: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  IMPORT: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
};

const entityTypes = ['Tender', 'AwardedTender', 'Vehicle', 'WorkOrder', 'User', 'Document', 'Auth'];
const actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'];

interface ChangeDetailModalProps { log: AuditLog | null; onClose: () => void; }

const ChangeDetailModal: React.FC<ChangeDetailModalProps> = ({ log, onClose }) => {
  if (!log) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div><h2 className="text-xl font-bold text-white">Audit Log Detail</h2><p className="text-slate-400 text-sm mt-0.5">{log.description}</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Action', value: log.action },
              { label: 'Entity', value: log.entity },
              { label: 'User', value: log.userName || log.user?.name || 'System' },
              { label: 'Role', value: log.userRole || '—' },
              { label: 'IP Address', value: log.ipAddress || '—' },
              { label: 'Status', value: log.status },
              { label: 'Entity ID', value: log.entityId ? `${log.entityId.substring(0, 16)}...` : '—' },
              { label: 'Timestamp', value: new Date(log.createdAt).toLocaleString('en-IN') },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-800/50 rounded-xl p-3">
                <div className="text-slate-400 text-xs mb-1">{label}</div>
                <div className="text-white text-sm font-medium break-all">{value}</div>
              </div>
            ))}
          </div>
          {log.changes && Object.keys(log.changes).length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-3">Field Changes</h3>
              {Object.entries(log.changes).map(([field, change]) => (
                <div key={field} className="bg-slate-800/50 rounded-xl p-3 mb-2">
                  <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">{field}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-red-400 mb-1">Before</div>
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-300 text-xs break-all">{JSON.stringify(change.before) || '(empty)'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-emerald-400 mb-1">After</div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-emerald-300 text-xs break-all">{JSON.stringify(change.after) || '(empty)'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {log.userAgent && (
            <div className="bg-slate-800/50 rounded-xl p-3">
              <div className="text-slate-400 text-xs mb-1">User Agent</div>
              <div className="text-slate-300 text-xs break-all">{log.userAgent}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/audit-logs', {
        params: { page, limit: 15, search, action: actionFilter, entity: entityFilter, status: statusFilter, from: dateFrom, to: dateTo },
      });
      const d = res.data.data;
      setLogs(d.auditLogs || d.data || []);
      setPagination({ total: d.pagination?.total || 0, totalPages: d.pagination?.totalPages || 1 });
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, [page, search, actionFilter, entityFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/import-export/export', {
        params: { module: 'audit-logs', from: dateFrom, to: dateTo, action: actionFilter, entity: entityFilter },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert('Export failed.'); }
    finally { setExporting(false); }
  };

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      cell: (log) => (
        <div>
          <div className="text-slate-300 text-sm">{new Date(log.createdAt).toLocaleDateString('en-IN')}</div>
          <div className="text-slate-500 text-xs">{new Date(log.createdAt).toLocaleTimeString('en-IN')}</div>
        </div>
      ),
    },
    {
      header: 'User',
      cell: (log) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(log.userName || log.user?.name || 'S').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate max-w-[110px]">{log.userName || log.user?.name || 'System'}</div>
            <div className="text-slate-500 text-xs">{log.userRole || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Action',
      cell: (log) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${actionColors[log.action] || 'text-slate-400 bg-slate-500/10 border-slate-500/30'}`}>
          {log.action}
        </span>
      ),
    },
    {
      header: 'Entity',
      cell: (log) => (
        <div>
          <div className="text-slate-300 text-sm font-medium">{log.entity}</div>
          {log.entityId && <div className="text-slate-500 text-xs font-mono">{log.entityId.substring(0, 10)}...</div>}
        </div>
      ),
    },
    {
      header: 'Description',
      cell: (log) => <span className="text-slate-400 text-sm line-clamp-2 max-w-[220px]">{log.description}</span>,
    },
    {
      header: 'IP',
      cell: (log) => <span className="text-slate-500 text-xs font-mono">{log.ipAddress || '—'}</span>,
    },
    {
      header: 'Status',
      cell: (log) => (
        <div className="flex items-center gap-1.5">
          {log.status === 'Success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          <span className={`text-sm ${log.status === 'Success' ? 'text-emerald-400' : 'text-red-400'}`}>{log.status}</span>
        </div>
      ),
    },
    {
      header: '',
      cell: (log) => (
        <button onClick={() => setSelectedLog(log)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all" title="View Details">
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Complete immutable trail of all system activities, user actions, and data changes"
        moduleName="audit-logs"
      >
        <button onClick={handleExport} disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-sm disabled:opacity-60">
          <Download className="w-4 h-4" />Export Logs
        </button>
        <button onClick={fetchLogs} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </PageHeader>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: pagination.total, color: 'text-sky-400', icon: <Activity className="w-5 h-5" /> },
          { label: 'This Page', value: logs.length, color: 'text-purple-400', icon: <Info className="w-5 h-5" /> },
          { label: 'Success', value: logs.filter(l => l.status === 'Success').length, color: 'text-emerald-400', icon: <CheckCircle2 className="w-5 h-5" /> },
          { label: 'Failed', value: logs.filter(l => l.status === 'Failed').length, color: 'text-red-400', icon: <AlertCircle className="w-5 h-5" /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex items-center gap-3">
            <div className={color}>{icon}</div>
            <div><div className={`text-xl font-bold ${color}`}>{value}</div><div className="text-slate-400 text-xs">{label}</div></div>
          </div>
        ))}
      </div>

      {/* Date filters */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <span className="text-slate-400 text-sm">Filter by date:</span>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm" />
        <span className="text-slate-500 text-sm">to</span>
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm" />
      </div>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search audit logs..."
        pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        emptyMessage="No audit logs found for the selected filters."
        filters={
          <>
            <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none">
              <option value="">All Actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none">
              <option value="">All Entities</option>
              {entityTypes.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none">
              <option value="">All Statuses</option>
              {['Success', 'Failed', 'Warning'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        }
      />

      <ChangeDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};
