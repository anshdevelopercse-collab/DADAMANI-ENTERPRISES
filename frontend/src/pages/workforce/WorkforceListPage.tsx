import React, { useState, useEffect } from 'react';
import { Users, UserPlus2, Trash2, ArrowRightLeft, History, Edit2 } from 'lucide-react';
import { api } from '../../services/api';
import { Workforce, WorkforceAllocation } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Drawer } from '../../components/common/Drawer';
import { WorkforceFormModal } from './WorkforceFormModal';
import { AssignWorkforceModal } from './AssignWorkforceModal';
import { useAuth } from '../../contexts/AuthContext';

export const WorkforceListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [workforce, setWorkforce] = useState<Workforce[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Workforce | null>(null);
  const [assignTarget, setAssignTarget] = useState<Workforce | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Workforce | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [historyTarget, setHistoryTarget] = useState<Workforce | null>(null);
  const [history, setHistory] = useState<WorkforceAllocation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchWorkforce();
  }, [page, search, typeFilter]);

  const fetchWorkforce = async () => {
    setLoading(true);
    try {
      const res = await api.get('/workforce', { params: { page, limit: 10, search, type: typeFilter || undefined } });
      setWorkforce(res.data?.data || []);
      setPagination(res.data?.meta || { total: 0, totalPages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openHistory = async (member: Workforce) => {
    setHistoryTarget(member);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/workforce/${member._id}/history`);
      setHistory(res.data?.data || []);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/workforce/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchWorkforce();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete workforce member');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Workforce>[] = [
    { header: 'Name', cell: (w) => <span className="font-medium text-slate-100">{w.name}</span> },
    { header: 'Type', cell: (w) => <span className="text-slate-300">{w.type}</span> },
    { header: 'Phone', accessorKey: 'phone' },
    { header: 'Status', cell: (w) => <StatusBadge status={w.status} size="sm" /> },
    {
      header: 'Actions',
      align: 'right',
      cell: (w) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => openHistory(w)} title="Assignment history" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition">
            <History className="w-4 h-4" />
          </button>
          {hasPermission('workforce:update') && (
            <button onClick={() => setEditTarget(w)} title="Edit member" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {hasPermission('workforce:assign') && (
            <button onClick={() => setAssignTarget(w)} title="Assign to contract" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition">
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
          {hasPermission('workforce:delete') && (
            <button onClick={() => setDeleteTarget(w)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Workforce"
        subtitle="Drivers, operators, mechanics, supervisors and other operational personnel"
        onAddClick={hasPermission('workforce:create') ? () => setFormOpen(true) : undefined}
        addLabel="Add Member"
      />

      {loading ? (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
          <SkeletonTableRows rows={6} columns={5} />
        </div>
      ) : workforce.length === 0 ? (
        <div className="glass-card rounded-2xl border border-slate-800/80">
          <EmptyState
            icon={Users}
            title="No workforce members yet"
            description="Add drivers, operators, mechanics or supervisors to start assigning them to contracts."
            action={
              hasPermission('workforce:create') && (
                <button
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition"
                >
                  <UserPlus2 className="w-4 h-4" /> Add Member
                </button>
              )
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={workforce}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search by name, phone, license…"
          filters={
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Types</option>
              {['Driver', 'Operator', 'Mechanic', 'Supervisor', 'Other'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          }
          pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      )}

      <WorkforceFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchWorkforce} />
      <WorkforceFormModal
        isOpen={!!editTarget}
        workforceToEdit={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={fetchWorkforce}
      />
      <AssignWorkforceModal
        isOpen={!!assignTarget}
        workforce={assignTarget}
        onClose={() => setAssignTarget(null)}
        onAssigned={fetchWorkforce}
      />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete ${deleteTarget?.name}?`}
        description="This removes the workforce record permanently. Their past assignment history is not affected."
        confirmLabel="Delete"
        isLoading={deleting}
      />

      <Drawer isOpen={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`${historyTarget?.name} — Assignment History`}>
        {historyLoading ? (
          <SkeletonTableRows rows={4} columns={2} />
        ) : history.length === 0 ? (
          <EmptyState title="No assignment history yet" description="This workforce member hasn't been assigned to a contract." />
        ) : (
          <div className="space-y-3">
            {history.map((h) => {
              const wo = typeof h.workOrder === 'string' ? null : h.workOrder;
              return (
                <div key={h._id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-100">{wo ? `${wo.orderNumber} — ${wo.title}` : 'Work order'}</span>
                    <StatusBadge status={h.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {new Date(h.startDate).toLocaleDateString()} {h.endDate ? `→ ${new Date(h.endDate).toLocaleDateString()}` : '→ ongoing'}
                  </p>
                  {h.notes && <p className="text-sm text-slate-400 mt-2">{h.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>
    </div>
  );
};
