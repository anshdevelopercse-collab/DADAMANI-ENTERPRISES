import React, { useState, useEffect } from 'react';
import { Receipt, FileText, Trash2, Eye } from 'lucide-react';
import { api } from '../../services/api';
import { Invoice, AdvanceAdjustment } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Drawer } from '../../components/common/Drawer';
import { InvoiceFormModal } from './InvoiceFormModal';
import { useAuth } from '../../contexts/AuthContext';

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const InvoiceListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailTarget, setDetailTarget] = useState<Invoice | null>(null);
  const [invoiceAdjustments, setInvoiceAdjustments] = useState<AdvanceAdjustment[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);

  const openDetail = async (invoice: Invoice) => {
    setDetailTarget(invoice);
    setAdjustmentsLoading(true);
    try {
      const res = await api.get(`/invoices/${invoice._id}/adjustments`);
      setInvoiceAdjustments(res.data?.data || []);
    } finally {
      setAdjustmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, search, statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/invoices', { params: { page, limit: 10, search, status: statusFilter || undefined } });
      setInvoices(res.data?.data || []);
      setPagination(res.data?.meta || { total: 0, totalPages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/invoices/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchInvoices();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Invoice>[] = [
    { header: 'Invoice #', cell: (i) => <span className="font-mono text-slate-200">{i.invoiceNumber}</span> },
    {
      header: 'Contract',
      cell: (i) => {
        const wo = typeof i.workOrder === 'string' ? null : i.workOrder;
        return wo ? <span>{wo.orderNumber} <span className="text-slate-500">— {wo.clientName}</span></span> : '—';
      },
    },
    { header: 'Billing Month', accessorKey: 'billingMonth' },
    { header: 'Amount', align: 'right', cell: (i) => <span className="font-medium text-slate-100">{formatCurrency(i.amount)}</span> },
    {
      header: 'Adjusted / Payable',
      align: 'right',
      cell: (i) => (
        <span className="text-slate-400">
          {formatCurrency(i.totalAdjusted)} <span className="text-slate-600">/</span> {formatCurrency(i.amount - i.totalAdjusted)}
        </span>
      ),
    },
    { header: 'Status', cell: (i) => <StatusBadge status={i.status} size="sm" /> },
    {
      header: 'Actions',
      align: 'right',
      cell: (i) => (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => openDetail(i)} title="View advance adjustments" className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition">
            <Eye className="w-4 h-4" />
          </button>
          {hasPermission('invoice:delete') && i.totalAdjusted === 0 && (
            <button onClick={() => setDeleteTarget(i)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition">
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
        title="Invoices"
        subtitle="Month-wise billing records per contract"
        onAddClick={hasPermission('invoice:create') ? () => setFormOpen(true) : undefined}
        addLabel="New Invoice"
      />

      {loading ? (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
          <SkeletonTableRows rows={6} columns={7} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="glass-card rounded-2xl border border-slate-800/80">
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Invoices are now tracked as their own monthly records instead of a single field on the work order."
            action={
              hasPermission('invoice:create') && (
                <button
                  onClick={() => setFormOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition"
                >
                  <FileText className="w-4 h-4" /> New Invoice
                </button>
              )
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search invoice number…"
          filters={
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Statuses</option>
              {['Draft', 'Sent', 'Partially Paid', 'Paid', 'Cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          }
          pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      )}

      <InvoiceFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchInvoices} />

      <Drawer isOpen={!!detailTarget} onClose={() => setDetailTarget(null)} title={`Invoice ${detailTarget?.invoiceNumber}`}>
        {detailTarget && (
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Invoice Amount</div>
                <div className="font-bold text-slate-100 mt-0.5">{formatCurrency(detailTarget.amount)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Advance Adjusted</div>
                <div className="font-bold text-amber-400 mt-0.5">{formatCurrency(detailTarget.totalAdjusted)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">Remaining Payable</div>
                <div className="font-bold text-emerald-400 mt-0.5">{formatCurrency(detailTarget.amount - detailTarget.totalAdjusted)}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Advance Adjustments Applied</div>
              {adjustmentsLoading ? (
                <SkeletonTableRows rows={3} columns={3} />
              ) : invoiceAdjustments.length === 0 ? (
                <EmptyState title="No adjustments" description="No contract advance has been adjusted against this invoice." />
              ) : (
                <div className="space-y-2">
                  {invoiceAdjustments.map((adj) => {
                    const adv = typeof adj.advance === 'string' ? null : adj.advance as any;
                    return (
                      <div key={adj._id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/50">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-100">{formatCurrency(adj.amountAdjusted)}</span>
                          <span className="text-xs text-slate-400">{new Date(adj.date).toLocaleDateString('en-IN')}</span>
                        </div>
                        {adv && (
                          <div className="text-xs text-slate-400 mt-1">
                            Advance to: <span className="text-slate-200">{adv.recipientName}</span>
                            {' '}<span className="text-slate-600">·</span>{' '}
                            Total: {formatCurrency(adv.amount)}
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete invoice ${deleteTarget?.invoiceNumber}?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        isLoading={deleting}
      />
    </div>
  );
};
