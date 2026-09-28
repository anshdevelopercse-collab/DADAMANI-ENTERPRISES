import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { api } from '../../services/api';
import { ContractAdvance, Invoice } from '../../types';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

interface Props {
  isOpen: boolean;
  advance: ContractAdvance | null;
  onClose: () => void;
  onAdjusted: () => void;
}

export const AdjustAdvanceModal: React.FC<Props> = ({ isOpen, advance, onClose, onAdjusted }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const remaining = advance ? advance.amount - advance.totalAdjusted : 0;
  const selectedInv = invoices.find((i) => i._id === selectedInvoice);
  const invoiceOutstanding = selectedInv ? selectedInv.amount - selectedInv.totalAdjusted : 0;

  useEffect(() => {
    if (isOpen && advance) {
      const wo = typeof advance.workOrder === 'string' ? advance.workOrder : advance.workOrder._id;
      setSelectedInvoice('');
      setAmount('');
      setNotes('');
      setError(null);
      fetchInvoices(wo);
    }
  }, [isOpen, advance]);

  const fetchInvoices = async (workOrderId: string) => {
    try {
      const res = await api.get('/invoices', { params: { workOrder: workOrderId, limit: 50 } });
      setInvoices((res.data?.data || []).filter((i: Invoice) => i.status !== 'Cancelled' && i.amount - i.totalAdjusted > 0));
    } catch { /* non-blocking */ }
  };

  const validate = (): boolean => {
    const amt = Number(amount);
    if (!selectedInvoice) { setError('Select an invoice to adjust against'); return false; }
    if (!amt || amt <= 0) { setError('Adjustment amount must be positive'); return false; }
    if (amt > remaining) { setError(`Cannot adjust more than remaining advance balance (${fmt(remaining)})`); return false; }
    if (amt > invoiceOutstanding) { setError(`Cannot adjust more than invoice outstanding amount (${fmt(invoiceOutstanding)})`); return false; }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!advance) return;
    setSaving(true);
    try {
      await api.post(`/contract-advances/${advance._id}/adjustments`, {
        invoice: selectedInvoice,
        amountAdjusted: Number(amount),
        notes: notes || undefined,
      });
      setConfirmOpen(false);
      onAdjusted();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Adjustment failed');
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Adjust Advance Against Invoice"
        subtitle={advance ? `Advance to ${advance.recipientName} — Remaining: ${fmt(remaining)}` : ''}
        footer={
          <>
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition">
              Cancel
            </button>
            <button
              form="adjust-form"
              type="submit"
              disabled={saving || remaining <= 0}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Preview Adjustment'}
            </button>
          </>
        }
      >
        <form id="adjust-form" onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>
          )}

          {remaining <= 0 && (
            <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              This advance is fully adjusted. No remaining balance.
            </div>
          )}

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/40 grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Advance</div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">{fmt(advance?.amount ?? 0)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Already Adjusted</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">{fmt(advance?.totalAdjusted ?? 0)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Remaining</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{fmt(remaining)}</div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Invoice to adjust against <span className="text-rose-400">*</span></label>
            <select value={selectedInvoice} onChange={(e) => { setSelectedInvoice(e.target.value); setError(null); }} className={inputCls}>
              <option value="">Select an invoice…</option>
              {invoices.map((inv) => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} — {inv.billingMonth} — Outstanding: {fmt(inv.amount - inv.totalAdjusted)}
                </option>
              ))}
            </select>
            {invoices.length === 0 && (
              <p className="text-xs text-slate-500 mt-1">No eligible invoices found for this contract.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Adjustment Amount (₹) <span className="text-rose-400">*</span></label>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                max={Math.min(remaining, invoiceOutstanding)}
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(null); }}
                placeholder={`Max: ${fmt(Math.min(remaining, invoiceOutstanding))}`}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Notes (optional)</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adjustment reference"
                className={inputCls}
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Confirm Advance Adjustment"
        description={`Adjust ${fmt(Number(amount))} of the advance against invoice ${selectedInv?.invoiceNumber ?? ''}? This cannot be undone.`}
        confirmLabel="Confirm Adjustment"
        isLoading={saving}
      />
    </>
  );
};
