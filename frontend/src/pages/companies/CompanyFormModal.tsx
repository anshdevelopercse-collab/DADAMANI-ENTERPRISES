import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';

interface Company {
  _id?: string;
  name: string;
  code: string;
  isPrimary?: boolean;
  registrationNumber?: string;
  gstNumber?: string;
  panNumber?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  companyToEdit?: Company | null;
}

const empty: Omit<Company, '_id'> = {
  name: '',
  code: '',
  isPrimary: false,
  registrationNumber: '',
  gstNumber: '',
  panNumber: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  isActive: true,
};

export const CompanyFormModal: React.FC<Props> = ({ isOpen, onClose, onSaved, companyToEdit }) => {
  const isEdit = !!companyToEdit?._id;
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(companyToEdit ? { ...empty, ...companyToEdit } : empty);
      setError(null);
    }
  }, [isOpen, companyToEdit]);

  const set = (f: string, v: string | boolean) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: any = { ...form };
      if (!payload.registrationNumber) delete payload.registrationNumber;
      if (!payload.gstNumber) delete payload.gstNumber;
      if (!payload.panNumber) delete payload.panNumber;

      if (isEdit) {
        await api.put(`/companies/${companyToEdit!._id}`, payload);
      } else {
        await api.post('/companies', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save company');
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
      title={isEdit ? 'Edit Legal Entity' : 'Register Legal Entity'}
      subtitle="Company / entity details — these are the legal entities that own contracts"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition">
            Cancel
          </button>
          <button
            form="company-form"
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-sky-600 hover:bg-sky-500 transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Entity' : 'Register Entity'}
          </button>
        </>
      }
    >
      <form id="company-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>Legal Name <span className="text-rose-400">*</span></label>
            <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Entity Code <span className="text-rose-400">*</span></label>
            <input
              required
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="e.g. DM01"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Registration Number</label>
            <input value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>GST Number</label>
            <input value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>PAN Number</label>
            <input value={form.panNumber} onChange={(e) => set('panNumber', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Email <span className="text-rose-400">*</span></label>
            <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Phone <span className="text-rose-400">*</span></label>
            <input required value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
          </div>

          <div className="col-span-2">
            <label className={labelCls}>Address <span className="text-rose-400">*</span></label>
            <textarea required value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>City <span className="text-rose-400">*</span></label>
            <input required value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>State <span className="text-rose-400">*</span></label>
            <input required value={form.state} onChange={(e) => set('state', e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Status</label>
            <select value={form.isActive ? 'true' : 'false'} onChange={(e) => set('isActive', e.target.value === 'true')} className={inputCls}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              id="company-primary"
              type="checkbox"
              checked={!!form.isPrimary}
              onChange={(e) => set('isPrimary', e.target.checked)}
              className="w-4 h-4 rounded accent-sky-500"
            />
            <label htmlFor="company-primary" className="text-xs text-slate-300 cursor-pointer">
              Primary firm <span className="text-slate-500">(only one can be primary)</span>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
};
