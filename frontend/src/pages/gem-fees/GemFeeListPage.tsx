import React, { useState, useEffect, useCallback } from 'react';
import { BadgePercent, Trash2, Eye } from 'lucide-react';
import { api } from '../../services/api';
import { GemFee } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Drawer } from '../../components/common/Drawer';
import { GemFeeFormModal } from './GemFeeFormModal';
import { useAuth } from '../../contexts/AuthContext';
import { FirmBadge } from '../../components/firm/FirmBadge';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const GemFeeListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [fees, setFees] = useState<GemFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [totalAmount, setTotalAmount] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GemFee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<GemFee | null>(null);

  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/gem-fees', {
        params: { page, limit: 10, search: search || undefined, feeType: feeTypeFilter || undefined },
      });
      const data: GemFee[] = res.data?.data || [];
      setFees(data);
      setPagination(res.data?.meta || { total: 0, totalPages: 1 });
      setTotalAmount(data.reduce((s, f) => s + f.amount, 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, feeTypeFilter]);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/gem-fees/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchFees();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete GEM fee record');
    } finally {
      setDeleting(false);
    }
  };

  const FEE_TYPES = ['GEM Portal Fee', 'Transaction Charge', 'Handling Fee', 'Other'];

  const columns: Column<GemFee>[] = [
    { header: 'Firm', cell: (f) => <FirmBadge firm={(f as any).firm} /> },
    {
      header: 'Contract',
      cell: (f) => {
        const wo = typeof f.workOrder === 'string' ? null : f.workOrder;
        return wo ? (
          <div>
            <div className="font-mono text-xs text-sky-400">{wo.orderNumber}</div>
            <div className="text-[11px] text-slate-400 line-clamp-1">{wo.clientName}</div>
          </div>
        ) : <span className="text-slate-500">—</span>;
      },
    },
    {
      header: 'Tender',
      cell: (f) => {
        const t = typeof f.tenderRef === 'string' || !f.tenderRef ? null : f.tenderRef;
        return t ? <span className="font-mono text-xs text-slate-300">{t.tenderNumber}</span> : <span className="text-slate-500">—</span>;
      },
    },
    { header: 'Fee Type', cell: (f) => <span className="text-slate-300 text-sm">{f.feeType}</span> },
    {
      header: 'Rate %',
      align: 'right',
      cell: (f) => f.ratePercent != null ? (
        <span className="font-mono text-slate-300">{f.ratePercent}%</span>
      ) : <span className="text-slate-600 italic text-xs">—</span>,
    },
    {
      header: 'Amount Paid',
      align: 'right',
      cell: (f) => <span className="font-bold text-slate-100">{fmt(f.amount)}</span>,
    },
    {
      header: 'Payment Date',
      cell: (f) => <span className="text-slate-400 text-xs">{new Date(f.paymentDate).toLocaleDateString('en-IN')}</span>,
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (f) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => setDetailTarget(f)} title="View details" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition">
            <Eye className="w-4 h-4" />
          </button>
          {hasPermission('gemfee:delete') && (
            <button onClick={() => setDeleteTarget(f)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition">
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
        title="GEM Portal Fees"
        subtitle="Fees paid after winning tenders on the Government e-Marketplace"
        onAddClick={hasPermission('gemfee:create') ? () => setFormOpen(true) : undefined}
        addLabel="Record Fee"
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Total GEM Fees (page)"
          value={fmt(totalAmount)}
          icon={<BadgePercent className="w-5 h-5" />}
          colorScheme="blue"
        />
        <StatCard
          title="Records (page)"
          value={fees.length}
          icon={<BadgePercent className="w-5 h-5" />}
          colorScheme="indigo"
        />
      </div>

      {loading ? (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
          <SkeletonTableRows rows={6} columns={7} />
        </div>
      ) : fees.length === 0 ? (
        <div className="glass-card rounded-2xl border border-slate-800/80">
          <EmptyState
            icon={BadgePercent}
            title="No GEM fee records yet"
            description="Record fees paid on the Government e-Marketplace after tender wins."
            action={
              hasPermission('gemfee:create') && (
                <button
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition"
                >
                  <BadgePercent className="w-4 h-4" /> Record Fee
                </button>
              )
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={fees}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search GEM fees…"
          filters={
            <select
              value={feeTypeFilter}
              onChange={(e) => { setFeeTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Fee Types</option>
              {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          }
          pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      )}

      <GemFeeFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchFees} />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete GEM Fee Record?"
        description={`This will permanently delete the ${fmt(deleteTarget?.amount ?? 0)} fee record. This cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleting}
      />

      <Drawer isOpen={!!detailTarget} onClose={() => setDetailTarget(null)} title="GEM Fee Details">
        {detailTarget && (
          <div className="space-y-3 text-sm">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
              <DetailRow label="Contract" value={
                typeof detailTarget.workOrder !== 'string'
                  ? `${detailTarget.workOrder.orderNumber} — ${detailTarget.workOrder.clientName}`
                  : detailTarget.workOrder
              } />
              <DetailRow label="Fee Type" value={detailTarget.feeType} />
              <DetailRow label="Amount Paid" value={<span className="font-bold text-slate-100">{fmt(detailTarget.amount)}</span>} />
              <DetailRow label="Rate %" value={detailTarget.ratePercent != null ? `${detailTarget.ratePercent}%` : '—'} />
              <DetailRow label="Payment Date" value={new Date(detailTarget.paymentDate).toLocaleDateString('en-IN')} />
              {detailTarget.description && <DetailRow label="Notes" value={detailTarget.description} />}
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
              The rate percentage is informational only. The recorded amount is the authoritative figure.
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
    <div className="text-slate-200 mt-0.5">{value}</div>
  </div>
);
