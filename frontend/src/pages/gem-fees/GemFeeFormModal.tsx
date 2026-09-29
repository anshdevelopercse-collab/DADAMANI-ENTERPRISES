import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { Tender } from '../../types';
import { ContractSelect } from '../../components/firm/ContractSelect';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const FEE_TYPES = ['GEM Portal Fee', 'Transaction Charge', 'Handling Fee', 'Other'];

const emptyForm = {
  workOrder: '',
  tenderRef: '',
  feeType: 'GEM Portal Fee',
  ratePercent: '',
  amount: '',
  paymentDate: new Date().toISOString().split('T')[0],
  description: '',
};

export const GemFeeFormModal: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setError(null);
      api.get('/tenders', { params: { limit: 100, status: 'Awarded' }, headers: { 'X-Firm-Scope': 'all' } })
        .then((r) => setTenders(r.data?.data || []))
        .catch(() => setTenders([]));
    }
  }, [isOpen]);

  const set = (f: string, v: string) => setForm((prev) => ({ ...prev, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setError('Amount must be a positive number'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        workOrder: form.workOrder,
        feeType: form.feeType,
        amount: amt,
        paymentDate: form.paymentDate,
      };
      if (form.tenderRef) payload.tenderRef = form.tenderRef;
      if (form.ratePercent) payload.ratePercent = Number(form.ratePercent);
      if (form.description) payload.description = form.description;

      await api.post('/gem-fees', payload);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record GEM fee');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500';
  const labelCls = 'block text-xs font-medium text-slate-400 mb-1.5';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record GEM Portal Fee"
      subtitle="Fee paid after winning a tender on the Government e-Marketplace"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition">
            Cancel
          </button>
          <button
            form="gem-fee-form"
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Record Fee'}
          </button>
        </>
      }
    >
      <form id="gem-fee-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>
        )}

        <ContractSelect
          id="gem-contract"
          label="Contract / Work Order"
          value={form.workOrder}
          onChange={(contractId) => set('workOrder', contractId)}
          required
        />

        <div>
          <label className={labelCls}>Related Tender (optional)</label>
          <select value={form.tenderRef} onChange={(e) => set('tenderRef', e.target.value)} className={inputCls}>
            <option value="">None</option>
            {tenders.map((t) => (
              <option key={t._id} value={t._id}>{t.tenderNumber} — {t.title}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fee Type <span className="text-rose-400">*</span></label>
            <select value={form.feeType} onChange={(e) => set('feeType', e.target.value)} className={inputCls}>
              {FEE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Payment Date <span className="text-rose-400">*</span></label>
            <input
              required
              type="date"
              value={form.paymentDate}
              onChange={(e) => set('paymentDate', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Rate / % (optional)
              <span className="ml-1 text-[10px] text-slate-500">— leave blank if unknown</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.ratePercent}
              onChange={(e) => set('ratePercent', e.target.value)}
              placeholder="e.g. 0.5"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Actual Amount Paid (₹) <span className="text-rose-400">*</span></label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="Exact amount from receipt"
              className={inputCls}
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
          The actual amount is always recorded independently. The percentage rate is informational only and is never used to compute the fee.
        </div>

        <div>
          <label className={labelCls}>Notes / Reference (optional)</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            placeholder="Receipt reference, portal transaction ID, etc."
            className={inputCls}
          />
        </div>
      </form>
    </Modal>
  );
};
