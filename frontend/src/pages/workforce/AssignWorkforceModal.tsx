import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { Workforce } from '../../types';

interface AssignWorkforceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned: () => void;
  workforce: Workforce | null;
}

export const AssignWorkforceModal: React.FC<AssignWorkforceModalProps> = ({ isOpen, onClose, onAssigned, workforce }) => {
  const [workOrders, setWorkOrders] = useState<{ _id: string; orderNumber: string; title: string }[]>([]);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedWorkOrder('');
    setNotes('');
    setError(null);
    api.get('/work-orders', { params: { limit: 100, status: undefined } }).then((res) => {
      setWorkOrders(res.data?.data || []);
    });
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workforce) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/workforce/${workforce._id}/assign`, { workOrder: selectedWorkOrder, notes });
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign — this contract may belong to a different entity.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign ${workforce?.name || ''}`}
      subtitle="Reassigning ends the current active assignment and preserves it in history."
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition">
            Cancel
          </button>
          <button
            form="assign-workforce-form"
            type="submit"
            disabled={saving || !selectedWorkOrder}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 transition disabled:opacity-50"
          >
            {saving ? 'Assigning…' : 'Assign'}
          </button>
        </>
      }
    >
      <form id="assign-workforce-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Work Order / Contract</label>
          <select
            required
            value={selectedWorkOrder}
            onChange={(e) => setSelectedWorkOrder(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="">Select a work order…</option>
            {workOrders.map((wo) => (
              <option key={wo._id} value={wo._id}>{wo.orderNumber} — {wo.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      </form>
    </Modal>
  );
};
