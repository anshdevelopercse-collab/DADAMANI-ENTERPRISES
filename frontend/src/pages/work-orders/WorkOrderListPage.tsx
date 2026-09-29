import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Eye, Edit2, Trash2, CheckCircle2, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { api } from '../../services/api';
import { WorkOrder } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/common/StatCard';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Drawer } from '../../components/common/Drawer';
import { FirmBadge } from '../../components/firm/FirmBadge';
import { WorkOrderFormModal } from './WorkOrderFormModal';
import { useAuth } from '../../contexts/AuthContext';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

export const WorkOrderListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkOrder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<WorkOrder | null>(null);

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/work-orders', { params: { page, limit: 10, search, status: statusFilter || undefined } });
      setWorkOrders(res.data?.data || []);
      setPagination(res.data?.meta || { total: 0, totalPages: 1 });
    } catch { setWorkOrders([]); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchWorkOrders(); }, [fetchWorkOrders]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/work-orders/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchWorkOrders();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete work order');
    } finally { setDeleting(false); }
  };

  const columns: Column<WorkOrder>[] = [
    { header: 'Firm', cell: (wo) => <FirmBadge firm={wo.firm} /> },
    {
      header: 'Contract',
      cell: (wo) => (
        <div>
          <div className="font-mono text-sky-400 font-medium text-xs">{wo.orderNumber}</div>
          <div className="text-white font-medium text-sm truncate max-w-[200px]">{wo.title}</div>
          <div className="text-slate-400 text-xs truncate">{wo.clientName}</div>
        </div>
      ),
    },
    {
      header: 'Site',
      cell: (wo) => <span className="text-slate-300 text-sm">{wo.siteLocation || '—'}</span>,
    },
    {
      header: 'Status',
      cell: (wo) => <StatusBadge status={wo.status} />,
    },
    {
      header: 'Deadline',
      cell: (wo) => {
        const end = wo.targetEndDate;
        if (!end) return <span className="text-slate-500">—</span>;
        const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
        return (
          <div>
            <div className="text-slate-300 text-sm">{new Date(end).toLocaleDateString('en-IN')}</div>
            {days < 0 && <div className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{Math.abs(days)}d overdue</div>}
            {days >= 0 && days <= 7 && <div className="text-amber-400 text-xs">{days}d left</div>}
          </div>
        );
      },
    },
    {
      header: 'Contract Value',
      cell: (wo) => <span className="text-emerald-400 font-medium text-sm">{formatCurrency(wo.contractValue)}</span>,
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (wo) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => setDetailTarget(wo)} className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition" title="View">
            <Eye className="w-4 h-4" />
          </button>
          {hasPermission('work_order:update') && (
            <button onClick={() => { setEditTarget(wo); setFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition" title="Edit">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {hasPermission('work_order:delete') && (
            <button onClick={() => setDeleteTarget(wo)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const totalBudget = workOrders.reduce((s, w) => s + (w.contractValue || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        subtitle="Contracts, site assignments and financial tracking"
        onAddClick={hasPermission('work_order:create') ? () => { setEditTarget(null); setFormOpen(true); } : undefined}
        addLabel="New Work Order"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Contracts" value={pagination.total} icon={<ClipboardList className="w-5 h-5" />} colorScheme="blue" />
        <StatCard title="In Progress" value={workOrders.filter((w) => w.status === 'In Progress').length} icon={<Calendar className="w-5 h-5" />} colorScheme="amber" />
        <StatCard title="Completed" value={workOrders.filter((w) => w.status === 'Completed').length} icon={<CheckCircle2 className="w-5 h-5" />} colorScheme="emerald" />
        <StatCard
          title="Total Value"
          value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' }).format(totalBudget)}
          icon={<DollarSign className="w-5 h-5" />}
          colorScheme="indigo"
        />
      </div>

      <DataTable
        columns={columns}
        data={workOrders}
        loading={loading}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by contract number, title, client…"
        pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        emptyMessage="No work orders found."
        filters={
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none">
            <option value="">All Statuses</option>
            {['Draft', 'Assigned', 'In Progress', 'Completed', 'Cancelled', 'Invoiced'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        }
      />

      <WorkOrderFormModal
        isOpen={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSuccess={fetchWorkOrders}
        orderToEdit={editTarget}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.orderNumber}?`}
        description="This removes the work order permanently. Financial records linked to it will retain the reference."
        confirmLabel="Delete"
        isLoading={deleting}
      />

      <Drawer isOpen={!!detailTarget} onClose={() => setDetailTarget(null)} title={`${detailTarget?.orderNumber} — ${detailTarget?.title}`}>
        {detailTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FirmBadge firm={detailTarget.firm} size="md" />
              {!detailTarget.firm && (
                <span className="text-[11px] text-amber-400">No firm assigned — financial records cannot be created until one is set.</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Client', value: detailTarget.clientName },
                { label: 'Site', value: detailTarget.siteLocation || '—' },
                { label: 'Start', value: new Date(detailTarget.startDate).toLocaleDateString('en-IN') },
                { label: 'Deadline', value: new Date(detailTarget.targetEndDate).toLocaleDateString('en-IN') },
                { label: 'Contract Value', value: formatCurrency(detailTarget.contractValue) },
                { label: 'Progress', value: `${detailTarget.progressPercentage}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800/50 rounded-xl p-3">
                  <div className="text-slate-400 text-xs mb-1">{label}</div>
                  <div className="text-white font-medium text-sm">{value}</div>
                </div>
              ))}
            </div>
            {detailTarget.scopeDetails && (
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-2">Scope of Work</div>
                <div className="text-slate-300 text-sm">{detailTarget.scopeDetails}</div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
