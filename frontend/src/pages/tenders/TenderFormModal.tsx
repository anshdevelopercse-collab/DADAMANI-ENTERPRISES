import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { Tender } from '../../types';
import { useFirm } from '../../contexts/FirmContext';
import { FirmSelect } from '../../components/firm/FirmSelect';

const firmIdOf = (f: any): string => (!f ? '' : typeof f === 'string' ? f : f._id);

interface TenderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenderToEdit?: Tender | null;
}

export const TenderFormModal: React.FC<TenderFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tenderToEdit,
}) => {
  const { defaultFirmId } = useFirm();
  const [firm, setFirm] = useState('');
  const [formData, setFormData] = useState({
    tenderNumber: '',
    title: '',
    clientName: '',
    clientDepartment: '',
    category: 'Logistics',
    estimatedValue: '',
    earnestMoneyDeposit: '',
    submissionDeadline: '',
    location: '',
    state: 'Odisha',
    status: 'Draft',
    scopeOfWork: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenderToEdit) {
      setFirm(firmIdOf(tenderToEdit.entity ?? tenderToEdit.firm));
      setFormData({
        tenderNumber: tenderToEdit.tenderNumber,
        title: tenderToEdit.title,
        clientName: tenderToEdit.clientName,
        clientDepartment: tenderToEdit.clientDepartment || '',
        category: tenderToEdit.category,
        estimatedValue: String(tenderToEdit.estimatedValue),
        earnestMoneyDeposit: String(tenderToEdit.earnestMoneyDeposit || ''),
        submissionDeadline: tenderToEdit.submissionDeadline ? tenderToEdit.submissionDeadline.split('T')[0] : '',
        location: tenderToEdit.location,
        state: tenderToEdit.state || 'Odisha',
        status: tenderToEdit.status,
        scopeOfWork: tenderToEdit.scopeOfWork || '',
      });
    } else {
      setFirm(defaultFirmId);
      setFormData({
        tenderNumber: `DMI/TND-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
        title: '',
        clientName: '',
        clientDepartment: '',
        category: 'Logistics',
        estimatedValue: '',
        earnestMoneyDeposit: '',
        submissionDeadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        location: 'Talcher / Angul, Odisha',
        state: 'Odisha',
        status: 'Draft',
        scopeOfWork: '',
      });
    }
  }, [tenderToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tenderToEdit && !firm) {
      setError('Select the firm bidding for this tender');
      return;
    }
    setLoading(true);

    try {
      const payload: any = {
        ...formData,
        estimatedValue: Number(formData.estimatedValue),
        earnestMoneyDeposit: Number(formData.earnestMoneyDeposit || 0),
      };
      if (firm) payload.entity = firm;

      if (tenderToEdit) {
        await api.put(`/tenders/${tenderToEdit._id}`, payload);
      } else {
        await api.post('/tenders', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 animate-fade-in" style={{ height: '100dvh' }}>
      <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-bold text-white">
            {tenderToEdit ? 'Edit Tender Proposal' : 'Create New Tender Submission'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Record government or private contractor tender bidding parameters
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
              {error}
            </div>
          )}

          <form id="tender-form" onSubmit={handleSubmit} className="space-y-4">
            <FirmSelect
              id="tender-firm"
              label="Bidding firm"
              value={firm}
              onChange={setFirm}
              hint={tenderToEdit && !firmIdOf(tenderToEdit.entity ?? tenderToEdit.firm) ? 'This tender predates firm tracking. Selecting a firm assigns it permanently.' : undefined}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Tender Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.tenderNumber}
                  onChange={(e) => setFormData({ ...formData, tenderNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="Logistics">Logistics</option>
                  <option value="Mining">Mining</option>
                  <option value="Construction">Construction</option>
                  <option value="Transport">Transport</option>
                  <option value="Infrastructure">Infrastructure</option>
                  <option value="Government Supplies">Government Supplies</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Tender Title / Scope Summary *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                placeholder="e.g. Transportation of 2.5 MT Coal from Pit to Siding"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Client / Authority *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                  placeholder="e.g. Mahanadi Coalfields Ltd"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Client Department
                </label>
                <input
                  type="text"
                  value={formData.clientDepartment}
                  onChange={(e) => setFormData({ ...formData, clientDepartment: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                  placeholder="e.g. Materials & Transport"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Estimated Value (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.estimatedValue}
                  onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                  placeholder="e.g. 240000000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  EMD Amount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.earnestMoneyDeposit}
                  onChange={(e) => setFormData({ ...formData, earnestMoneyDeposit: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                  placeholder="e.g. 4800000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Submission Deadline *
                </label>
                <input
                  type="date"
                  required
                  value={formData.submissionDeadline}
                  onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Site Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Lifecycle Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Awarded">Awarded</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Detailed Scope of Work
              </label>
              <textarea
                rows={3}
                value={formData.scopeOfWork}
                onChange={(e) => setFormData({ ...formData, scopeOfWork: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                placeholder="Technical specifications, equipment requirements, milestone terms..."
              />
            </div>
          </form>
        </div>
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
        >
          Cancel
        </button>
        <button
          form="tender-form"
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/30 flex items-center gap-2 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{tenderToEdit ? 'Save Changes' : 'Submit Tender Bid'}</span>
        </button>
      </div>
    </div>
  );
};
