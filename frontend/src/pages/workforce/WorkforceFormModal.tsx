import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { Workforce, FirmField } from '../../types';
import { useFirm } from '../../contexts/FirmContext';
import { FirmSelect } from '../../components/firm/FirmSelect';

const firmIdOf = (firm: FirmField | undefined): string => (!firm ? '' : typeof firm === 'string' ? firm : firm._id);

interface WorkforceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  workforceToEdit?: Workforce | null;
}

const emptyForm = {
  name: '',
  type: 'Driver' as Workforce['type'],
  phone: '',
  licenseNumber: '',
  licenseExpiry: '',
  experienceYears: '',
  status: 'Active' as Workforce['status'],
  notes: '',
};

export const WorkforceFormModal: React.FC<WorkforceFormModalProps> = ({ isOpen, onClose, onSaved, workforceToEdit }) => {
  const isEdit = !!workforceToEdit;
  const { defaultFirmId } = useFirm();
  const [form, setForm] = useState(emptyForm);
  const [firm, setFirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFirm(workforceToEdit ? firmIdOf(workforceToEdit.firm) : defaultFirmId);
      if (workforceToEdit) {
        setForm({
          name: workforceToEdit.name,
          type: workforceToEdit.type,
          phone: workforceToEdit.phone || '',
          licenseNumber: workforceToEdit.licenseNumber || '',
          licenseExpiry: workforceToEdit.licenseExpiry ? workforceToEdit.licenseExpiry.slice(0, 10) : '',
          experienceYears: workforceToEdit.experienceYears?.toString() || '',
          status: workforceToEdit.status,
          notes: workforceToEdit.notes || '',
        });
      } else {
        setForm(emptyForm);
      }
      setError(null);
    }
  }, [isOpen, workforceToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isEdit && !firm) {
      setError('Select the firm this workforce member belongs to');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.licenseNumber) delete payload.licenseNumber;
      if (!payload.licenseExpiry) delete payload.licenseExpiry;
      if (payload.experienceYears) payload.experienceYears = Number(payload.experienceYears);
      else delete payload.experienceYears;
      if (firm) payload.firm = firm;

      if (isEdit && workforceToEdit) {
        await api.put(`/workforce/${workforceToEdit._id}`, payload);
      } else {
        await api.post('/workforce', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save workforce member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Workforce Member' : 'Add Workforce Member'}
      subtitle="Driver, Operator, Mechanic, Supervisor or Other operational personnel"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition">
            Cancel
          </button>
          <button
            form="workforce-form"
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Member' : 'Save Member'}
          </button>
        </>
      }
    >
      <form id="workforce-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>}

        <FirmSelect
          id="workforce-firm"
          label="Employing firm"
          value={firm}
          onChange={setFirm}
          hint={isEdit && !firmIdOf(workforceToEdit?.firm) ? 'This record predates firm tracking. Selecting a firm assigns it permanently.' : undefined}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as Workforce['type'] })}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {['Driver', 'Operator', 'Mechanic', 'Supervisor', 'Other'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Workforce['status'] })}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            >
              {['Active', 'On Leave', 'Terminated'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Experience (years)</label>
            <input
              type="number"
              min={0}
              value={form.experienceYears}
              onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          {form.type === 'Driver' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">License Number</label>
                <input
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">License Expiry</label>
                <input
                  type="date"
                  value={form.licenseExpiry}
                  onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
            </>
          )}

          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};
