import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  User,
} from 'lucide-react';
import { api } from '../../services/api';
import { Task } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { TaskFormModal } from './TaskFormModal';

type Scope = 'mine' | 'personal' | 'assigned-to-me' | 'assigned-by-me' | 'all';

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-slate-700 text-slate-300',
  Medium: 'bg-blue-900/60 text-blue-300',
  High: 'bg-amber-900/60 text-amber-300',
  Urgent: 'bg-red-900/60 text-red-300',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Pending: <Circle className="w-4 h-4 text-slate-400" />,
  'In Progress': <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />,
  Completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
};

function isOverdue(task: Task) {
  return new Date(task.dueDate) < new Date() && task.status !== 'Completed';
}

function checklistProgress(task: Task) {
  if (!task.checklistItems?.length) return null;
  const done = task.checklistItems.filter((i) => i.isCompleted).length;
  return { done, total: task.checklistItems.length, pct: Math.round((done / task.checklistItems.length) * 100) };
}

function resolveUser(field: Task['createdBy'] | undefined) {
  if (!field) return null;
  return typeof field === 'string' ? null : field;
}

export const TasksPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [scope, setScope] = useState<Scope>('mine');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [assignMode, setAssignMode] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [checklistUpdating, setChecklistUpdating] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks', { params: { scope } });
      setTasks(res.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const toggleChecklist = async (task: Task, itemId: string, current: boolean) => {
    setChecklistUpdating(itemId);
    try {
      await api.put(`/tasks/${task._id}/checklist/${itemId}`, { isCompleted: !current });
      fetchTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setChecklistUpdating(null);
    }
  };

  const scopeTabs: { key: Scope; label: string }[] = [
    { key: 'mine', label: 'My Tasks' },
    { key: 'personal', label: 'Personal' },
    { key: 'assigned-to-me', label: 'Assigned to Me' },
    ...(hasPermission('task:assign') ? [{ key: 'assigned-by-me' as Scope, label: 'Assigned by Me' }] : []),
    ...(isAdmin ? [{ key: 'all' as Scope, label: 'All Tasks' }] : []),
  ];

  const overdueTasks = tasks.filter(isOverdue);
  const pendingTasks = tasks.filter((t) => t.status === 'Pending' && !isOverdue(t));
  const inProgressTasks = tasks.filter((t) => t.status === 'In Progress' && !isOverdue(t));
  const completedTasks = tasks.filter((t) => t.status === 'Completed');

  function TaskCard({ task }: { task: Task }) {
    const expanded = expandedId === task._id;
    const progress = checklistProgress(task);
    const overdue = isOverdue(task);
    const assignee = resolveUser(task.assignedTo);
    const creator = resolveUser(task.createdBy);

    return (
      <div
        className={`bg-slate-800/60 border rounded-xl transition-all ${
          overdue ? 'border-red-500/50' : 'border-slate-700/50'
        }`}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="mt-0.5 shrink-0">{STATUS_ICONS[task.status]}</div>
              <div className="min-w-0">
                <p className={`font-medium truncate ${task.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                  {task.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </span>
                  {overdue && (
                    <span className="flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="w-3 h-3" /> Overdue
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <CalendarClock className="w-3 h-3" />
                    {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {assignee && (
                    <span className="flex items-center gap-1 text-xs text-sky-400">
                      <User className="w-3 h-3" /> {assignee.name}
                    </span>
                  )}
                  {!task.isPersonal && !assignee && creator && (
                    <span className="text-xs text-slate-500">by {creator.name}</span>
                  )}
                </div>
                {progress && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-slate-700 rounded-full h-1.5 max-w-[120px]">
                      <div
                        className="bg-sky-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress.pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{progress.done}/{progress.total}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {task.checklistItems?.length > 0 && (
                <button
                  onClick={() => setExpandedId(expanded ? null : task._id)}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition"
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
              {hasPermission('task:update') && (
                <button
                  onClick={() => { setEditTarget(task); setAssignMode(false); setFormOpen(true); }}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-sky-400 transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {hasPermission('task:delete') && (
                <button
                  onClick={() => setDeleteTarget(task)}
                  className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {expanded && task.checklistItems?.length > 0 && (
          <div className="border-t border-slate-700/50 px-4 py-3 space-y-2">
            {task.checklistItems.map((item) => (
              <label key={item._id} className="flex items-center gap-3 cursor-pointer group">
                <button
                  disabled={!!checklistUpdating || task.status === 'Completed'}
                  onClick={() => toggleChecklist(task, item._id, item.isCompleted)}
                  className="shrink-0 text-slate-400 hover:text-sky-400 disabled:opacity-50 transition"
                >
                  {checklistUpdating === item._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : item.isCompleted ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>
                <span className={`text-sm ${item.isCompleted ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                  {item.title}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  function Section({ title, icon, items, emptyMsg }: { title: string; icon: React.ReactNode; items: Task[]; emptyMsg: string }) {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{title}</h3>
          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="space-y-2">
          {items.map((t) => <TaskCard key={t._id} task={t} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks & Checklists" subtitle="Manage your personal tasks and team assignments">
        <div className="flex gap-2">
          {hasPermission('task:assign') && (
            <button
              onClick={() => { setEditTarget(null); setAssignMode(true); setFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition"
            >
              <User className="w-4 h-4" /> Assign Task
            </button>
          )}
          {hasPermission('task:create') && (
            <button
              onClick={() => { setEditTarget(null); setAssignMode(false); setFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" /> New Task
            </button>
          )}
        </div>
      </PageHeader>

      {/* Scope tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        {scopeTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setScope(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              scope === tab.key
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No tasks found for this view.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Section
            title="Overdue"
            icon={<AlertCircle className="w-4 h-4 text-red-400" />}
            items={overdueTasks}
            emptyMsg="No overdue tasks"
          />
          <Section
            title="In Progress"
            icon={<Loader2 className="w-4 h-4 text-sky-400" />}
            items={inProgressTasks}
            emptyMsg="No in-progress tasks"
          />
          <Section
            title="Pending"
            icon={<Clock className="w-4 h-4 text-slate-400" />}
            items={pendingTasks}
            emptyMsg="No pending tasks"
          />
          <Section
            title="Completed"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            items={completedTasks}
            emptyMsg="No completed tasks"
          />
        </div>
      )}

      {formOpen && (
        <TaskFormModal
          task={editTarget}
          assignMode={assignMode}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); fetchTasks(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Task"
        description={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
