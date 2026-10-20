import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { AwardedTender } from '../../types';

interface AwardedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  awardedToEdit?: AwardedTender | null;
}

export const AwardedFormModal: React.FC<AwardedFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  awardedToEdit,
}) => {
  const [tenders, setTenders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    tender: '',
    tenderNumber: '',
    clientName: '',
    title: '',
    awardValue: '',
    estimatedCost: '',
    contractNumber: '',
    awardedDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    completionDeadline: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    vendorPartners: '',
    executionStatus: 'In Progress',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableTenders();
    if (awardedToEdit) {
      setFormData({
        tender: typeof awardedToEdit.tender === 'object' ? awardedToEdit.tender._id : awardedToEdit.tender,
        tenderNumber: awardedToEdit.tenderNumber,
        clientName: awardedToEdit.clientName,
        title: awardedToEdit.title,
        awardValue: String(awardedToEdit.awardValue),
        estimatedCost: String(awardedToEdit.estimatedCost),
        contractNumber: awardedToEdit.contractNumber,
        awardedDate: awardedToEdit.awardedDate ? awardedToEdit.awardedDate.split('T')[0] : '',
        startDate: awardedToEdit.startDate ? awardedToEdit.startDate.split('T')[0] : '',
        completionDeadline: awardedToEdit.completionDeadline ? awardedToEdit.completionDeadline.split('T')[0] : '',
        vendorPartners: (awardedToEdit.vendorPartners || []).join(', '),
        executionStatus: awardedToEdit.executionStatus,
        notes: awardedToEdit.notes || '',
      });
    }
  }, [awardedToEdit, isOpen]);

  const fetchAvailableTenders = async () => {
    try {
      const res = await api.get('/tenders?limit=50');
      if (res.data?.data) {
        setTenders(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTenderSelect = (tenderId: string) => {
    const selected = tenders.find((t) => t._id === tenderId);
    if (selected) {
      setFormData({
        ...formData,
        tender: selected._id,
        tenderNumber: selected.tenderNumber,
        clientName: selected.clientName,
        title: selected.title,
        awardValue: String(selected.estimatedValue),
        estimatedCost: String(Math.round(selected.estimatedValue * 0.82)),
        contractNumber: `CNT-${selected.tenderNumber.replace(/\//g, '-')}`,
      });
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...formData,
        awardValue: Number(formData.awardValue),
        estimatedCost: Number(formData.estimatedCost),
        vendorPartners: formData.vendorPartners
          ? formData.vendorPartners.split(',').map((v) => v.trim()).filter(Boolean)
          : [],
      };

      if (awardedToEdit) {
        await api.put(`/awarded-tenders/${awardedToEdit._id}`, payload);
      } else {
        await api.post('/awarded-tenders', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const val = Number(formData.awardValue) || 0;
  const cost = Number(formData.estimatedCost) || 0;
  const profit = val - cost;
  const margin = val > 0 ? ((profit / val) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 animate-fade-in" style={{ height: '100dvh' }}>
      <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-bold text-white">
            {awardedToEdit ? 'Edit Awarded Contract' : 'Record New Awarded Tender'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track execution status, profit margins, and vendor partner allocations
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

          <form id="awarded-form" onSubmit={handleSubmit} className="space-y-4">
            {!awardedToEdit && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Select Base Tender Proposal *
                </label>
                <select
                  required
                  value={formData.tender}
                  onChange={(e) => handleTenderSelect(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="">-- Choose from tender registry --</option>
                  {tenders.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.tenderNumber} - {t.title} ({t.clientName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Formal Contract Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contractNumber}
                  onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Execution Status
                </label>
                <select
                  value={formData.executionStatus}
                  onChange={(e) => setFormData({ ...formData, executionStatus: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                >
                  <option value="Pending Kickoff">Pending Kickoff</option>
                  <option value="In Progress">In Progress</option>
                  <option value="On Track">On Track</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Final Award Value (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.awardValue}
                  onChange={(e) => setFormData({ ...formData, awardValue: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Estimated Cost (₹) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.estimatedCost}
                  onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Projected Margin
                </label>
                <div className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-400">
                  ₹{(profit / 100000).toFixed(2)} L ({margin}%)
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Awarded Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.awardedDate}
                  onChange={(e) => setFormData({ ...formData, awardedDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Work Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Completion Deadline *
                </label>
                <input
                  type="date"
                  required
                  value={formData.completionDeadline}
                  onChange={(e) => setFormData({ ...formData, completionDeadline: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Vendor / Subcontractor Partners (comma separated)
              </label>
              <input
                type="text"
                value={formData.vendorPartners}
                onChange={(e) => setFormData({ ...formData, vendorPartners: e.target.value })}
                placeholder="e.g. Utkal Fleet Logistics, Kalinga Earthmovers"
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
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
          form="awarded-form"
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>{awardedToEdit ? 'Save Changes' : 'Record Contract'}</span>
        </button>
      </div>
    </div>
  );
};
