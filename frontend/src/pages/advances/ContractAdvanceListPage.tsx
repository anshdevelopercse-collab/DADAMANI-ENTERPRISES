import React, { useState, useEffect, useCallback } from 'react';
import { Banknote, ArrowRightLeft, Trash2, History, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import { ContractAdvance, AdvanceAdjustment } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Drawer } from '../../components/common/Drawer';
import { ContractAdvanceFormModal } from './ContractAdvanceFormModal';
import { AdjustAdvanceModal } from './AdjustAdvanceModal';
import { useAuth } from '../../contexts/AuthContext';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const ContractAdvanceListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [advances, setAdvances] = useState<ContractAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [stats, setStats] = useState({ total: 0, adjusted: 0, unadjusted: 0 });

  const [formOpen, setFormOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<ContractAdvance | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContractAdvance | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailTarget, setDetailTarget] = useState<ContractAdvance | null>(null);
  const [adjustments, setAdjustments] = useState<AdvanceAdjustment[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);

  const fetchAdvances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/contract-advances', { params: { page, limit: 10, search: search || undefined } });
      const data: ContractAdvance[] = res.data?.data || [];
      setAdvances(data);
      setPagination(res.data?.meta || { total: 0, totalPages: 1 });

      const total = data.reduce((s, a) => s + a.amount, 0);
      const adjusted = data.reduce((s, a) => s + a.totalAdjusted, 0);
      setStats({ total, adjusted, unadjusted: total - adjusted });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  const openDetail = async (adv: ContractAdvance) => {
    setDetailTarget(adv);
    setAdjustmentsLoading(true);
    try {
      const res = await api.get(`/contract-advances/${adv._id}/adjustments`);
      setAdjustments(res.data?.data || []);
    } finally {
      setAdjustmentsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/contract-advances/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchAdvances();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete advance');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ContractAdvance>[] = [
    {
      header: 'Contract',
      cell: (a) => {
        const wo = typeof a.workOrder === 'string' ? null : a.workOrder;
        return wo ? (
          <div>
            <div className="font-mono text-xs text-sky-400">{wo.orderNumber}</div>
            <div className="text-[11px] text-slate-400 line-clamp-1">{wo.clientName}</div>
          </div>
        ) : <span className="text-slate-500">—</span>;
      },
    },
    {
      header: 'Recipient',
      cell: (a) => (
        <div>
          <div className="font-medium text-slate-100 text-sm">{a.recipientName}</div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{a.recipientType}</span>
        </div>
      ),
    },
    {
      header: 'Amount',
      align: 'right',
      cell: (a) => <span className="font-bold text-slate-100">{fmt(a.amount)}</span>,
    },
    {
      header: 'Adjusted / Remaining',
      align: 'right',
      cell: (a) => {
        const rem = a.amount - a.totalAdjusted;
        return (
          <div className="text-right">
            <span className="text-amber-400 text-xs">{fmt(a.totalAdjusted)}</span>
            <span className="text-slate-600 mx-1">/</span>
            <span className={`text-xs font-semibold ${rem > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{fmt(rem)}</span>
          </div>
        );
      },
    },
    {
      header: 'Date',
      cell: (a) => <span className="text-slate-400 text-xs">{new Date(a.date).toLocaleDateString('en-IN')}</span>,
    },
    {
      header: 'Status',
      cell: (a) => {
        const rem = a.amount - a.totalAdjusted;
        if (rem <= 0) return <StatusBadge status="Fully Adjusted" size="sm" />;
        if (a.totalAdjusted > 0) return <StatusBadge status="Partially Adjusted" size="sm" />;
        return <StatusBadge status="Unadjusted" size="sm" />;
      },
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (a) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => openDetail(a)} title="View adjustment timeline" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition">
            <History className="w-4 h-4" />
          </button>
          {hasPermission('advance:adjust') && a.amount - a.totalAdjusted > 0 && (
            <button onClick={() => setAdjustTarget(a)} title="Adjust against invoice" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition">
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
          {hasPermission('advance:delete') && a.totalAdjusted === 0 && (
            <button onClick={() => setDeleteTarget(a)} title="Delete advance" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition">
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
        title="Contract Advances"
        subtitle="Pre-bill advances issued against running contracts — with adjustment tracking"
        onAddClick={hasPermission('advance:create') ? () => setFormOpen(true) : undefined}
        addLabel="Record Advance"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Advances (page)" value={fmt(stats.total)} icon={<Banknote className="w-5 h-5" />} colorScheme="blue" />
        <StatCard title="Total Unadjusted" value={fmt(stats.unadjusted)} icon={<ChevronRight className="w-5 h-5" />} colorScheme="amber" />
        <StatCard title="Total Adjusted" value={fmt(stats.adjusted)} icon={<ArrowRightLeft className="w-5 h-5" />} colorScheme="emerald" />
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
          <SkeletonTableRows rows={6} columns={7} />
        </div>
      ) : advances.length === 0 ? (
        <div className="glass-card rounded-2xl border border-slate-800/80">
          <EmptyState
            icon={Banknote}
            title="No contract advances yet"
            description="Record a pre-bill advance issued to a contract handler."
            action={
              hasPermission('advance:create') && (
                <button
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition"
                >
                  <Banknote className="w-4 h-4" /> Record Advance
                </button>
              )
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={advances}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search by recipient name…"
          pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      )}

      <ContractAdvanceFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchAdvances} />

      <AdjustAdvanceModal
        isOpen={!!adjustTarget}
        advance={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onAdjusted={fetchAdvances}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Contract Advance?"
        description={`This will permanently delete the advance of ${fmt(deleteTarget?.amount ?? 0)} to ${deleteTarget?.recipientName}. Only unadjusted advances can be deleted.`}
        confirmLabel="Delete"
        isLoading={deleting}
      />

      <Drawer
        isOpen={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        title={`Advance — ${detailTarget?.recipientName}`}
      >
        {detailTarget && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Amount</div>
                <div className="font-bold text-slate-100 mt-0.5">{fmt(detailTarget.amount)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Remaining</div>
                <div className={`font-bold mt-0.5 ${detailTarget.amount - detailTarget.totalAdjusted > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {fmt(detailTarget.amount - detailTarget.totalAdjusted)}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Reason</div>
                <div className="text-slate-300 mt-0.5">{detailTarget.reason}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Adjustment Timeline</div>
              {adjustmentsLoading ? (
                <SkeletonTableRows rows={3} columns={3} />
              ) : adjustments.length === 0 ? (
                <EmptyState title="No adjustments yet" description="No advance amount has been adjusted against any invoice." />
              ) : (
                <div className="space-y-2">
                  {adjustments.map((adj) => {
                    const inv = typeof adj.invoice === 'string' ? null : adj.invoice;
                    return (
                      <div key={adj._id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-100">{fmt(adj.amountAdjusted)}</span>
                          <span className="text-xs text-slate-400">{new Date(adj.date).toLocaleDateString('en-IN')}</span>
                        </div>
                        {inv && (
                          <div className="text-xs text-slate-400 mt-1">
                            Invoice: <span className="font-mono text-sky-400">{inv.invoiceNumber}</span>
                            {' '}<span className="text-slate-600">·</span>{' '}{inv.billingMonth}
                          </div>
                        )}
                        {adj.notes && <p className="text-xs text-slate-500 mt-1">{adj.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
