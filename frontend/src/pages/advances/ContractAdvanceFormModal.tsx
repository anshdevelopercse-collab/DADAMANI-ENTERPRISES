import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { WorkOrder } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const emptyForm = {
  workOrder: '',
  recipientType: 'External' as 'Workforce' | 'User' | 'External',
  recipientRef: '',
  recipientName: '',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  reason: '',
};

export const ContractAdvanceFormModal: React.FC<Props> = ({ isOpen, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(emptyForm);
      setError(null);
      fetchWorkOrders();
    }
  }, [isOpen]);

  const fetchWorkOrders = async () => {
    try {
      const res = await api.get('/work-orders', { params: { limit: 100, status: 'In Progress' } });
      setWorkOrders(res.data?.data || []);
    } catch { /* non-blocking */ }
  };

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setError('Amount must be a positive number'); return; }
    if (!form.recipientName.trim()) { setError('Recipient name is required'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        workOrder: form.workOrder,
        recipientType: form.recipientType,
        recipientName: form.recipientName,
        amount: amt,
        date: form.date,
        reason: form.reason,
      };
      if (form.recipientType !== 'External' && form.recipientRef) {
        payload.recipientRef = form.recipientRef;
      }
      await api.post('/contract-advances', payload);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record advance');
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
      title="Record Contract Advance"
      subtitle="Issue a pre-bill advance against a running contract"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition">
            Cancel
          </button>
          <button
            form="advance-form"
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Record Advance'}
          </button>
        </>
      }
    >
      <form id="advance-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>
        )}

        <div>
          <label className={labelCls}>Contract / Work Order <span className="text-rose-400">*</span></label>
          <select required value={form.workOrder} onChange={(e) => set('workOrder', e.target.value)} className={inputCls}>
            <option value="">Select a work order…</option>
            {workOrders.map((wo) => (
              <option key={wo._id} value={wo._id}>{wo.orderNumber} — {wo.title} ({wo.clientName})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Recipient Type <span className="text-rose-400">*</span></label>
            <select value={form.recipientType} onChange={(e) => set('recipientType', e.target.value as any)} className={inputCls}>
              <option value="External">External (not an employee)</option>
              <option value="Workforce">Workforce member</option>
              <option value="User">System user</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>
              {form.recipientType === 'External' ? 'Recipient Name' : 'Recipient Name'} <span className="text-rose-400">*</span>
            </label>
            <input
              required
              value={form.recipientName}
              onChange={(e) => set('recipientName', e.target.value)}
              placeholder={form.recipientType === 'External' ? 'Full name of recipient' : 'Name for records'}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Amount (₹) <span className="text-rose-400">*</span></label>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="e.g. 60000"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Date <span className="text-rose-400">*</span></label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Reason / Purpose <span className="text-rose-400">*</span></label>
          <textarea
            required
            value={form.reason}
            onChange={(e) => set('reason', e.target.value)}
            rows={2}
            placeholder="Why is this advance being issued?"
            className={inputCls}
          />
        </div>
      </form>
    </Modal>
  );
};
