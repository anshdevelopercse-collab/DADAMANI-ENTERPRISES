import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  X,
  Building2,
} from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/common/StatCard';

interface WorkOrderMilestone {
  title: string;
  description?: string;
  targetDate: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delayed';
}

interface WorkOrder {
  _id: string;
  workOrderNumber: string;
  title: string;
  clientName: string;
  projectName?: string;
  location: string;
  startDate: string;
  endDate: string;
  estimatedCost: number;
  actualCost: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  progressPercentage: number;
  milestones?: WorkOrderMilestone[];
  description?: string;
  createdAt: string;
}

const priorityColors: Record<string, string> = {
  Low: 'bg-slate-500/20 text-slate-300 border-slate-600',
  Medium: 'bg-blue-500/20 text-blue-300 border-blue-600',
  High: 'bg-amber-500/20 text-amber-300 border-amber-600',
  Critical: 'bg-red-500/20 text-red-300 border-red-600',
};

interface WorkOrderFormModalProps {
  open: boolean;
  onClose: () => void;
  workOrder: WorkOrder | null;
  onSaved: () => void;
}

const WorkOrderFormModal: React.FC<WorkOrderFormModalProps> = ({ open, onClose, workOrder, onSaved }) => {
  const [form, setForm] = useState({
    title: '', clientName: '', projectName: '', location: '',
    startDate: '', endDate: '', estimatedCost: '',
    status: 'Pending', priority: 'Medium', progressPercentage: '0', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (workOrder) {
      setForm({
        title: workOrder.title || '', clientName: workOrder.clientName || '',
        projectName: workOrder.projectName || '', location: workOrder.location || '',
        startDate: workOrder.startDate ? workOrder.startDate.substring(0, 10) : '',
        endDate: workOrder.endDate ? workOrder.endDate.substring(0, 10) : '',
        estimatedCost: String(workOrder.estimatedCost || ''),
        status: workOrder.status || 'Pending', priority: workOrder.priority || 'Medium',
        progressPercentage: String(workOrder.progressPercentage || '0'),
        description: workOrder.description || '',
      });
    } else {
      setForm({ title: '', clientName: '', projectName: '', location: '', startDate: '', endDate: '',
        estimatedCost: '', status: 'Pending', priority: 'Medium', progressPercentage: '0', description: '' });
    }
    setErrors({});
  }, [workOrder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.clientName.trim()) errs.clientName = 'Client is required';
    if (!form.startDate) errs.startDate = 'Start date required';
    if (!form.endDate) errs.endDate = 'End date required';
    if (!form.estimatedCost) errs.estimatedCost = 'Budget required';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const payload = { ...form, estimatedCost: Number(form.estimatedCost), progressPercentage: Number(form.progressPercentage) };
      if (workOrder) await api.put(`/work-orders/${workOrder._id}`, payload);
      else await api.post('/work-orders', payload);
      onSaved(); onClose();
    } catch (err: any) {
      setErrors({ api: err.response?.data?.message || 'Failed to save' });
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{workOrder ? 'Edit Work Order' : 'Create Work Order'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.api && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{errors.api}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Work Order Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
                placeholder="e.g. Road Construction Phase 1" />
              {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
            </div>
            {[
              { key: 'clientName', label: 'Client Name *', placeholder: 'Client / Government Body' },
              { key: 'projectName', label: 'Project Name', placeholder: 'Project / Contract Name' },
              { key: 'location', label: 'Location', placeholder: 'Site / District / State' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
                <input type="text" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
                  placeholder={placeholder} />
                {errors[key] && <p className="text-red-400 text-xs mt-1">{errors[key]}</p>}
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Estimated Cost (₹) *</label>
              <input type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm" />
              {errors.estimatedCost && <p className="text-red-400 text-xs mt-1">{errors.estimatedCost}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Start Date *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm" />
              {errors.startDate && <p className="text-red-400 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">End Date *</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm" />
              {errors.endDate && <p className="text-red-400 text-xs mt-1">{errors.endDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm">
                {['Pending', 'In Progress', 'Completed', 'On Hold', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm">
                {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Progress ({form.progressPercentage}%)</label>
              <input type="range" min="0" max="100" value={form.progressPercentage}
                onChange={(e) => setForm({ ...form, progressPercentage: e.target.value })} className="w-full accent-sky-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm resize-none"
                placeholder="Scope of work, special conditions..." />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-sm">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium transition-all text-sm disabled:opacity-60 flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {workOrder ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const WorkOrderListPage: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [detailWO, setDetailWO] = useState<WorkOrder | null>(null);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/work-orders', { params: { page, limit: 10, search, status: statusFilter } });
      const data = res.data.data;
      setWorkOrders(data.workOrders || data.data || []);
      setPagination({ total: data.pagination?.total || 0, totalPages: data.pagination?.totalPages || 1 });
    } catch { setWorkOrders([]); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchWorkOrders(); }, [fetchWorkOrders]);

  const handleDelete = async (wo: WorkOrder) => {
    if (!confirm(`Delete work order "${wo.workOrderNumber}"?`)) return;
    try { await api.delete(`/work-orders/${wo._id}`); fetchWorkOrders(); }
    catch { alert('Failed to delete'); }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

  const columns: Column<WorkOrder>[] = [
    {
      header: 'Work Order',
      cell: (wo) => (
        <div>
          <div className="font-mono text-sky-400 font-medium text-xs">{wo.workOrderNumber}</div>
          <div className="text-white font-medium text-sm truncate max-w-[180px]">{wo.title}</div>
          <div className="text-slate-400 text-xs">{wo.clientName}</div>
        </div>
      ),
    },
    {
      header: 'Location',
      cell: (wo) => <span className="text-slate-300 text-sm">{wo.location || '—'}</span>,
    },
    {
      header: 'Priority',
      cell: (wo) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${priorityColors[wo.priority] || 'bg-slate-500/20 text-slate-300 border-slate-600'}`}>
          {wo.priority}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (wo) => <StatusBadge status={wo.status} />,
    },
    {
      header: 'Progress',
      cell: (wo) => (
        <div className="w-28">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-500">Done</span>
            <span className="text-white font-medium">{wo.progressPercentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${wo.progressPercentage >= 100 ? 'bg-emerald-500' : wo.progressPercentage >= 60 ? 'bg-sky-500' : 'bg-amber-500'}`}
              style={{ width: `${wo.progressPercentage}%` }} />
          </div>
        </div>
      ),
    },
    {
      header: 'Budget',
      cell: (wo) => <span className="text-emerald-400 font-medium text-sm">{formatCurrency(wo.estimatedCost)}</span>,
    },
    {
      header: 'Deadline',
      cell: (wo) => {
        const days = Math.ceil((new Date(wo.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return (
          <div>
            <div className="text-slate-300 text-sm">{new Date(wo.endDate).toLocaleDateString('en-IN')}</div>
            {days < 0 && <div className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{Math.abs(days)}d overdue</div>}
            {days >= 0 && days <= 7 && <div className="text-amber-400 text-xs">{days}d left</div>}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: (wo) => (
        <div className="flex items-center gap-2">
          <button onClick={() => setDetailWO(wo)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all" title="View">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => { setSelectedWO(wo); setModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(wo)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const totalBudget = workOrders.reduce((s, w) => s + w.estimatedCost, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        subtitle="Manage project work orders, milestones, and progress tracking"
        onAddClick={() => { setSelectedWO(null); setModalOpen(true); }}
        addLabel="New Work Order"
        moduleName="work-orders"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Orders" value={pagination.total} icon={<ClipboardList className="w-5 h-5" />} colorScheme="blue" />
        <StatCard title="In Progress" value={workOrders.filter((w) => w.status === 'In Progress').length} icon={<Calendar className="w-5 h-5" />} colorScheme="amber" />
        <StatCard title="Completed" value={workOrders.filter((w) => w.status === 'Completed').length} icon={<CheckCircle2 className="w-5 h-5" />} colorScheme="emerald" />
        <StatCard title="Total Budget" value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' }).format(totalBudget)} icon={<DollarSign className="w-5 h-5" />} colorScheme="indigo" />
      </div>

      <DataTable
        columns={columns}
        data={workOrders}
        loading={loading}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search work orders..."
        pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        emptyMessage="No work orders found. Create your first work order."
        filters={
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none">
            <option value="">All Statuses</option>
            {['Pending', 'In Progress', 'Completed', 'On Hold', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        }
      />

      <WorkOrderFormModal open={modalOpen} onClose={() => setModalOpen(false)} workOrder={selectedWO} onSaved={fetchWorkOrders} />

      {detailWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <p className="text-sky-400 font-mono text-sm">{detailWO.workOrderNumber}</p>
                <h2 className="text-xl font-bold text-white">{detailWO.title}</h2>
              </div>
              <button onClick={() => setDetailWO(null)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Client', value: detailWO.clientName },
                  { label: 'Location', value: detailWO.location || '—' },
                  { label: 'Start', value: new Date(detailWO.startDate).toLocaleDateString('en-IN') },
                  { label: 'End', value: new Date(detailWO.endDate).toLocaleDateString('en-IN') },
                  { label: 'Budget', value: formatCurrency(detailWO.estimatedCost) },
                  { label: 'Actual Cost', value: formatCurrency(detailWO.actualCost) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-800/50 rounded-xl p-3">
                    <div className="text-slate-400 text-xs mb-1">{label}</div>
                    <div className="text-white font-medium text-sm">{value}</div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Overall Progress</span>
                  <span className="text-white font-bold">{detailWO.progressPercentage}%</span>
                </div>
                <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${detailWO.progressPercentage}%` }} />
                </div>
              </div>
              {detailWO.milestones && detailWO.milestones.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-3 text-sm">Milestones</h3>
                  <div className="space-y-2">
                    {detailWO.milestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-800/50 rounded-xl p-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status === 'Completed' ? 'bg-emerald-400' : m.status === 'In Progress' ? 'bg-sky-400' : m.status === 'Delayed' ? 'bg-red-400' : 'bg-slate-500'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm truncate">{m.title}</div>
                          <div className="text-slate-400 text-xs">Due: {new Date(m.targetDate).toLocaleDateString('en-IN')}</div>
                        </div>
                        <StatusBadge status={m.status} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailWO.description && (
                <div className="bg-slate-800/50 rounded-xl p-4">
                  <div className="text-slate-400 text-xs mb-2">Description</div>
                  <div className="text-slate-300 text-sm">{detailWO.description}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
