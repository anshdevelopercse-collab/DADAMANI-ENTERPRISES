import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { api } from '../../services/api';
import { Task, User } from '../../types';

interface Props {
  task: Task | null;
  assignMode: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate: string;
  assignedTo: string;
  reminderEnabled: boolean;
  minutesBefore: number;
  dailyReminder: boolean;
  checklistItems: { title: string }[];
}

const EMPTY: FormState = {
  title: '',
  description: '',
  priority: 'Medium',
  status: 'Pending',
  dueDate: '',
  assignedTo: '',
  reminderEnabled: false,
  minutesBefore: 60,
  dailyReminder: false,
  checklistItems: [],
};

function toDateInputValue(iso: string) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

export const TaskFormModal: React.FC<Props> = ({ task, assignMode, onClose, onSaved }) => {
  const isEdit = !!task?._id;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managers, setManagers] = useState<User[]>([]);

  useEffect(() => {
    if (assignMode) {
      api.get('/users', { params: { limit: 200, role: 'Manager' } }).then((res) => {
        setManagers(res.data?.data?.users || res.data?.data || []);
      }).catch(() => {});
    }
  }, [assignMode]);

  useEffect(() => {
    if (task) {
      const assignedId = typeof task.assignedTo === 'string' ? task.assignedTo : (task.assignedTo as any)?._id || '';
      setForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        dueDate: toDateInputValue(task.dueDate),
        assignedTo: assignedId,
        reminderEnabled: task.reminder?.enabled ?? false,
        minutesBefore: task.reminder?.minutesBefore ?? 60,
        dailyReminder: task.reminder?.dailyReminder ?? false,
        checklistItems: task.checklistItems?.map((ci) => ({ title: ci.title })) || [],
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [task]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const addChecklistItem = () => setForm((p) => ({ ...p, checklistItems: [...p.checklistItems, { title: '' }] }));
  const updateChecklistItem = (idx: number, val: string) =>
    setForm((p) => {
      const items = [...p.checklistItems];
      items[idx] = { title: val };
      return { ...p, checklistItems: items };
    });
  const removeChecklistItem = (idx: number) =>
    setForm((p) => ({ ...p, checklistItems: p.checklistItems.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.dueDate) { setError('Due date is required'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description || undefined,
        priority: form.priority,
        dueDate: new Date(form.dueDate).toISOString(),
        checklistItems: form.checklistItems.filter((ci) => ci.title.trim()),
        reminder: {
          enabled: form.reminderEnabled,
          minutesBefore: form.minutesBefore,
          dailyReminder: form.dailyReminder,
        },
      };

      if (isEdit) {
        payload.status = form.status;
        await api.put(`/tasks/${task!._id}`, payload);
      } else if (assignMode) {
        if (!form.assignedTo) { setError('Please select a manager to assign to'); setSaving(false); return; }
        payload.assignedTo = form.assignedTo;
        await api.post('/tasks/assign', payload);
      } else {
        await api.post('/tasks', payload);
      }

      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit ? 'Edit Task' : assignMode ? 'Assign Task to Manager' : 'New Personal Task';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white transition">
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Save Changes' : assignMode ? 'Assign Task' : 'Create Task'}
          </button>
        </div>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/30 text-red-300 text-sm">{error}</div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Title *</label>
          <input
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Task title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
          <textarea
            rows={3}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500 resize-none"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Optional details..."
          />
        </div>

        {/* Priority + Status + Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
            <select
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
              value={form.priority}
              onChange={(e) => set('priority', e.target.value as any)}
            >
              {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
              <select
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                value={form.status}
                onChange={(e) => set('status', e.target.value as any)}
              >
                {['Pending', 'In Progress', 'Completed'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Due Date & Time *</label>
            <input
              type="datetime-local"
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
              value={form.dueDate}
              onChange={(e) => set('dueDate', e.target.value)}
            />
          </div>
        </div>

        {/* Assign to (Admin mode) */}
        {assignMode && !isEdit && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Assign To *</label>
            <select
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
              value={form.assignedTo}
              onChange={(e) => set('assignedTo', e.target.value)}
            >
              <option value="">-- Select Manager --</option>
              {managers.map((m) => (
                <option key={m._id} value={m._id}>{m.name} ({m.email})</option>
              ))}
            </select>
          </div>
        )}

        {/* Reminder */}
        <div className="space-y-3 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="reminderEnabled"
              checked={form.reminderEnabled}
              onChange={(e) => set('reminderEnabled', e.target.checked)}
              className="rounded border-slate-500 text-sky-500"
            />
            <label htmlFor="reminderEnabled" className="text-sm font-medium text-slate-300">
              Enable Reminders
            </label>
          </div>
          {form.reminderEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notify before deadline (minutes)</label>
                <input
                  type="number"
                  min={0}
                  max={10080}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                  value={form.minutesBefore}
                  onChange={(e) => set('minutesBefore', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <input
                  type="checkbox"
                  id="dailyReminder"
                  checked={form.dailyReminder}
                  onChange={(e) => set('dailyReminder', e.target.checked)}
                  className="rounded border-slate-500 text-sky-500"
                />
                <label htmlFor="dailyReminder" className="text-sm text-slate-300">Daily reminder</label>
              </div>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-300">Checklist Items</label>
            <button
              type="button"
              onClick={addChecklistItem}
              className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>
          {form.checklistItems.length === 0 && (
            <p className="text-xs text-slate-500">No checklist items yet.</p>
          )}
          <div className="space-y-2">
            {form.checklistItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                  value={item.title}
                  onChange={(e) => updateChecklistItem(idx, e.target.value)}
                  placeholder={`Step ${idx + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeChecklistItem(idx)}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
