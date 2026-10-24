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
    submissionDeadline: '',
    location: '',
    state: 'Odisha',
    status: 'Draft',
    scopeOfWork: '',
  });

  // Bid slice config
  const [sliceEnabled, setSliceEnabled] = useState(false);
  const [sliceCount, setSliceCount] = useState(1);
  const [sliceAmounts, setSliceAmounts] = useState<string[]>(['']);

  // Status-conditional fields
  const [quotedAmount, setQuotedAmount] = useState('');
  const [awardedTo, setAwardedTo] = useState('');
  const [awardedAmount, setAwardedAmount] = useState('');
  const [awardSliceEnabled, setAwardSliceEnabled] = useState(false);
  const [awardSliceCount, setAwardSliceCount] = useState(1);
  const [awardSliceAmounts, setAwardSliceAmounts] = useState<string[]>(['']);

  // Rejection reason popup
  const [showRejectionPopup, setShowRejectionPopup] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [pendingPayload, setPendingPayload] = useState<any>(null);

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
        submissionDeadline: tenderToEdit.submissionDeadline
          ? tenderToEdit.submissionDeadline.split('T')[0]
          : '',
        location: tenderToEdit.location,
        state: tenderToEdit.state || 'Odisha',
        status: tenderToEdit.status,
        scopeOfWork: tenderToEdit.scopeOfWork || '',
      });
      const sc = tenderToEdit.sliceConfig;
      setSliceEnabled(sc?.enabled ?? false);
      const cnt = sc?.count ?? 1;
      setSliceCount(cnt);
      setSliceAmounts(sc?.amounts?.map(String) ?? Array(Math.max(1, cnt)).fill(''));
      setQuotedAmount(String(tenderToEdit.quotedAmount ?? ''));
      setAwardedTo(tenderToEdit.awardedTo ?? '');
      setAwardedAmount(String(tenderToEdit.awardedAmount ?? ''));
      const asc = tenderToEdit.awardSliceConfig;
      setAwardSliceEnabled(asc?.enabled ?? false);
      const acnt = asc?.count ?? 1;
      setAwardSliceCount(acnt);
      setAwardSliceAmounts(asc?.amounts?.map(String) ?? Array(Math.max(1, acnt)).fill(''));
      setRejectionReason(tenderToEdit.rejectionReason ?? '');
    } else {
      setFirm(defaultFirmId);
      setFormData({
        tenderNumber: `DMI/TND-${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
        title: '',
        clientName: '',
        clientDepartment: '',
        category: 'Logistics',
        estimatedValue: '',
        submissionDeadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        location: 'Talcher / Angul, Odisha',
        state: 'Odisha',
        status: 'Draft',
        scopeOfWork: '',
      });
      setSliceEnabled(false);
      setSliceCount(1);
      setSliceAmounts(['']);
      setQuotedAmount('');
      setAwardedTo('');
      setAwardedAmount('');
      setAwardSliceEnabled(false);
      setAwardSliceCount(1);
      setAwardSliceAmounts(['']);
      setRejectionReason('');
    }
    setError(null);
    setShowRejectionPopup(false);
    setPendingPayload(null);
  }, [tenderToEdit, isOpen]);

  if (!isOpen) return null;

  const resizeSlices = (
    n: number,
    setCount: (n: number) => void,
    setAmounts: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const clamped = Math.max(1, Math.min(20, n));
    setCount(clamped);
    setAmounts((prev) => {
      const next = [...prev];
      while (next.length < clamped) next.push('');
      return next.slice(0, clamped);
    });
  };

  const buildPayload = () => {
    const payload: any = {
      ...formData,
      estimatedValue: Number(formData.estimatedValue),
    };
    if (firm) payload.entity = firm;

    payload.sliceConfig = sliceEnabled
      ? { enabled: true, count: sliceCount, amounts: sliceAmounts.map(Number) }
      : { enabled: false, count: 0, amounts: [] };

    if (formData.status === 'Submitted' && quotedAmount) {
      payload.quotedAmount = Number(quotedAmount);
    }
    if (formData.status === 'Awarded') {
      payload.awardedTo = awardedTo;
      if (awardedAmount) payload.awardedAmount = Number(awardedAmount);
      payload.awardSliceConfig = awardSliceEnabled
        ? { enabled: true, count: awardSliceCount, amounts: awardSliceAmounts.map(Number) }
        : { enabled: false, count: 0, amounts: [] };
    }

    return payload;
  };

  const submitPayload = async (payload: any) => {
    setLoading(true);
    try {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tenderToEdit && !firm) {
      setError('Select the firm bidding for this tender');
      return;
    }
    if (formData.status === 'Rejected') {
      setPendingPayload(buildPayload());
      setShowRejectionPopup(true);
      return;
    }
    await submitPayload(buildPayload());
  };

  const handleConfirmRejection = async () => {
    if (!rejectionReason.trim()) return;
    setShowRejectionPopup(false);
    await submitPayload({ ...pendingPayload, rejectionReason: rejectionReason.trim() });
  };

  const inputCls =
    'w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none';
  const labelCls = 'block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-0 sm:p-4 sm:pt-2 overflow-y-auto">
        <div className="relative w-full sm:max-w-3xl sm:rounded-2xl bg-slate-950 flex flex-col min-h-screen sm:min-h-0 sm:max-h-[88vh] shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sm:rounded-t-2xl">
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

        {/* Scrollable body */}
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
                hint={
                  tenderToEdit && !firmIdOf(tenderToEdit.entity ?? tenderToEdit.firm)
                    ? 'This tender predates firm tracking. Selecting a firm assigns it permanently.'
                    : undefined
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tender Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.tenderNumber}
                    onChange={(e) => setFormData({ ...formData, tenderNumber: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={inputCls}
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
                <label className={labelCls}>Tender Title / Scope Summary *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Transportation of 2.5 MT Coal from Pit to Siding"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Client / Authority *</label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. Mahanadi Coalfields Ltd"
                  />
                </div>
                <div>
                  <label className={labelCls}>Client Department</label>
                  <input
                    type="text"
                    value={formData.clientDepartment}
                    onChange={(e) => setFormData({ ...formData, clientDepartment: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. Materials & Transport"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Estimated Value (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    className={inputCls}
                    placeholder="e.g. 240000000"
                  />
                </div>
                <div>
                  <label className={labelCls}>Submission Deadline *</label>
                  <input
                    type="date"
                    required
                    value={formData.submissionDeadline}
                    onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Slice Configuration */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Is the tender amount divided into slices?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSliceEnabled(true)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                        sliceEnabled
                          ? 'bg-sky-600 border-sky-500 text-white'
                          : 'border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSliceEnabled(false);
                        setSliceCount(1);
                        setSliceAmounts(['']);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                        !sliceEnabled
                          ? 'bg-slate-700 border-slate-600 text-white'
                          : 'border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {sliceEnabled && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className={labelCls}>Number of Slices *</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        required
                        value={sliceCount}
                        onChange={(e) =>
                          resizeSlices(Number(e.target.value), setSliceCount, setSliceAmounts)
                        }
                        className={inputCls + ' max-w-xs'}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sliceAmounts.map((amt, i) => (
                        <div key={i}>
                          <label className={labelCls}>Slice {i + 1} Amount (₹) *</label>
                          <input
                            type="number"
                            min={0}
                            required
                            value={amt}
                            onChange={(e) => {
                              const next = [...sliceAmounts];
                              next[i] = e.target.value;
                              setSliceAmounts(next);
                            }}
                            placeholder="e.g. 80000000"
                            className={inputCls}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Site Location *</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Lifecycle Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className={inputCls}
                  >
                    <option value="Draft">Draft</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Awarded">Awarded</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Quoted Amount — Submitted */}
              {formData.status === 'Submitted' && (
                <div>
                  <label className={labelCls}>Quoted Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={quotedAmount}
                    onChange={(e) => setQuotedAmount(e.target.value)}
                    className={inputCls}
                    placeholder="The amount quoted in the bid submission"
                  />
                </div>
              )}

              {/* Award Details — Awarded */}
              {formData.status === 'Awarded' && (
                <div className="p-4 rounded-xl border border-emerald-800/40 bg-emerald-500/5 space-y-4">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Award Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Awarded To *</label>
                      <input
                        type="text"
                        required
                        value={awardedTo}
                        onChange={(e) => setAwardedTo(e.target.value)}
                        className={inputCls}
                        placeholder="Name of the awarded party / contractor"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Awarded Amount (₹) *</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={awardedAmount}
                        onChange={(e) => setAwardedAmount(e.target.value)}
                        className={inputCls}
                        placeholder="e.g. 220000000"
                      />
                    </div>
                  </div>

                  {/* Award Slice Config */}
                  <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Is the awarded amount divided into slices?
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAwardSliceEnabled(true)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                            awardSliceEnabled
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAwardSliceEnabled(false);
                            setAwardSliceCount(1);
                            setAwardSliceAmounts(['']);
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition ${
                            !awardSliceEnabled
                              ? 'bg-slate-700 border-slate-600 text-white'
                              : 'border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {awardSliceEnabled && (
                      <div className="space-y-3 pt-1">
                        <div>
                          <label className={labelCls}>Number of Slices *</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            required
                            value={awardSliceCount}
                            onChange={(e) =>
                              resizeSlices(
                                Number(e.target.value),
                                setAwardSliceCount,
                                setAwardSliceAmounts
                              )
                            }
                            className={inputCls + ' max-w-xs'}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {awardSliceAmounts.map((amt, i) => (
                            <div key={i}>
                              <label className={labelCls}>Slice {i + 1} Amount (₹) *</label>
                              <input
                                type="number"
                                min={0}
                                required
                                value={amt}
                                onChange={(e) => {
                                  const next = [...awardSliceAmounts];
                                  next[i] = e.target.value;
                                  setAwardSliceAmounts(next);
                                }}
                                placeholder="e.g. 80000000"
                                className={inputCls}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Detailed Scope of Work</label>
                <textarea
                  rows={3}
                  value={formData.scopeOfWork}
                  onChange={(e) => setFormData({ ...formData, scopeOfWork: e.target.value })}
                  className={inputCls}
                  placeholder="Technical specifications, equipment requirements, milestone terms..."
                />
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-xl flex items-center justify-end gap-3 sm:rounded-b-2xl">
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
      </div>

      {/* Rejection Reason Popup */}
      {showRejectionPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Rejection Reason</h3>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Reason for Rejection <span className="text-rose-400">*</span>
              </label>
              <textarea
                autoFocus
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a clear reason for rejecting this tender..."
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
              />
              {!rejectionReason.trim() && (
                <p className="text-xs text-rose-400 mt-1">A rejection reason is required</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowRejectionPopup(false);
                  setPendingPayload(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={!rejectionReason.trim() || loading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 transition disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
