import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { WorkOrder } from '../../types';

interface WorkOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderToEdit?: WorkOrder | null;
}

export const WorkOrderFormModal: React.FC<WorkOrderFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  orderToEdit,
}) => {
  const [managers, setManagers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [tenders, setTenders] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    orderNumber: `WO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    title: '',
    clientName: '',
    relatedTender: '',
    assignedProject: '',
    siteLocation: '',
    assignedManager: '',
    assignedVehicles: [] as string[],
    priority: 'Medium',
    startDate: new Date().toISOString().split('T')[0],
    targetEndDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    contractValue: '',
    status: 'Assigned',
    scopeDetails: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrerequisites();
    if (orderToEdit) {
      setFormData({
        orderNumber: orderToEdit.orderNumber,
        title: orderToEdit.title,
        clientName: orderToEdit.clientName,
        relatedTender: orderToEdit.relatedTender?._id || '',
        assignedProject: orderToEdit.assignedProject,
        siteLocation: orderToEdit.siteLocation,
        assignedManager: orderToEdit.assignedManager?._id || '',
        assignedVehicles: (orderToEdit.assignedVehicles || []).map((v) => v._id),
        priority: orderToEdit.priority,
        startDate: orderToEdit.startDate ? orderToEdit.startDate.split('T')[0] : '',
        targetEndDate: orderToEdit.targetEndDate ? orderToEdit.targetEndDate.split('T')[0] : '',
        contractValue: String(orderToEdit.contractValue),
        status: orderToEdit.status,
        scopeDetails: orderToEdit.scopeDetails || '',
      });
    }
  }, [orderToEdit, isOpen]);

  const fetchPrerequisites = async () => {
    try {
      const [mgrRes, vehRes, tndRes] = await Promise.all([
        api.get('/users?role=Manager'),
        api.get('/vehicles?limit=50'),
        api.get('/tenders?limit=50'),
      ]);
      setManagers(mgrRes.data?.data || []);
      setVehicles(vehRes.data?.data || []);
      setTenders(tndRes.data?.data || []);
    } catch (e) {
      console.error(e);
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
        contractValue: Number(formData.contractValue),
        relatedTender: formData.relatedTender || undefined,
      };

      if (orderToEdit) {
        await api.put(`/work-orders/${orderToEdit._id}`, payload);
      } else {
        await api.post('/work-orders', payload);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 border border-slate-800 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-bold text-white mb-1">
          {orderToEdit ? 'Edit Work Order' : 'Create & Assign New Work Order'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Allocate managers, fleet units, project sites, and target deliverables
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Order Number *
              </label>
              <input
                type="text"
                required
                value={formData.orderNumber}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Work Order Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              placeholder="e.g. Daily Coal Dispatch Shift Operations - Siding 4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Client Organization *
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
                Linked Tender Proposal
              </label>
              <select
                value={formData.relatedTender}
                onChange={(e) => setFormData({ ...formData, relatedTender: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="">-- No Direct Tender Link --</option>
                {tenders.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.tenderNumber} - {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Assigned Project *
              </label>
              <input
                type="text"
                required
                value={formData.assignedProject}
                onChange={(e) => setFormData({ ...formData, assignedProject: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                placeholder="e.g. Talcher Coal Haulage 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Site Location *
              </label>
              <input
                type="text"
                required
                value={formData.siteLocation}
                onChange={(e) => setFormData({ ...formData, siteLocation: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
                placeholder="e.g. Hingula OCP Weighbridge 2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Lead Manager *
              </label>
              <select
                required
                value={formData.assignedManager}
                onChange={(e) => setFormData({ ...formData, assignedManager: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="">-- Choose Manager --</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Contract Value (₹) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.contractValue}
                onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="Draft">Draft</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Invoiced">Invoiced</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Target Completion Date *
              </label>
              <input
                type="date"
                required
                value={formData.targetEndDate}
                onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{orderToEdit ? 'Save Changes' : 'Issue Work Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
