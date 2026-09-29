import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { ContractSelect } from '../../components/firm/ContractSelect';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  workOrder: '',
  billingMonth: new Date().toISOString().slice(0, 7),
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().slice(0, 10),
  amount: '',
  status: 'Draft',
  notes: '',
};

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({ isOpen, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm);
    setError(null);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/invoices', { ...form, amount: Number(form.amount) });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Invoice"
      subtitle="A month-wise billing record tied to a contract"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition">
            Cancel
          </button>
          <button
            form="invoice-form"
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create Invoice'}
          </button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>}

        <ContractSelect
          id="invoice-contract"
          label="Contract (Work Order)"
          value={form.workOrder}
          onChange={(contractId) => setForm({ ...form, workOrder: contractId })}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Invoice Number</label>
            <input
              required
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Billing Month</label>
            <input
              type="month"
              required
              value={form.billingMonth}
              onChange={(e) => setForm({ ...form, billingMonth: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Invoice Date</label>
            <input
              type="date"
              required
              value={form.invoiceDate}
              onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Amount (₹)</label>
            <input
              type="number"
              min={0.01}
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      </form>
    </Modal>
  );
};
