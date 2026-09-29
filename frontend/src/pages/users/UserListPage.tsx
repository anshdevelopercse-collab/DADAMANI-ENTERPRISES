import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Edit2,
  Trash2,
  Shield,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Lock,
  UserCheck,
  UserX,
  Key,
} from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatCard } from '../../components/common/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { useFirm } from '../../contexts/FirmContext';
import { FirmBadges } from '../../components/firm/FirmBadge';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Viewer';
  isActive: boolean;
  customPermissions?: string[];
  firmAccessMode?: 'All' | 'Restricted';
  firmAccess?: any[];
  lastLogin?: string;
  createdAt: string;
}

const roleColors: Record<string, string> = {
  Admin: 'text-red-400 bg-red-500/10 border-red-500/30',
  Manager: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  Viewer: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
};

const allPermissions = [
  { key: 'tender:read', label: 'View Tenders' }, { key: 'tender:create', label: 'Create Tenders' },
  { key: 'tender:update', label: 'Edit Tenders' }, { key: 'tender:delete', label: 'Delete Tenders' },
  { key: 'vehicle:read', label: 'View Vehicles' }, { key: 'vehicle:create', label: 'Add Vehicles' },
  { key: 'vehicle:update', label: 'Edit Vehicles' }, { key: 'workorder:read', label: 'View Work Orders' },
  { key: 'workorder:create', label: 'Create Work Orders' }, { key: 'report:read', label: 'View Reports' },
  { key: 'report:export', label: 'Export Reports' }, { key: 'audit:read', label: 'View Audit Logs' },
];

interface UserFormModalProps { open: boolean; onClose: () => void; user: User | null; onSaved: () => void; }

const UserFormModal: React.FC<UserFormModalProps> = ({ open, onClose, user, onSaved }) => {
  const [form, setForm] = useState({ name: '', email: '', role: 'Viewer', password: '', isActive: true });
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) { setForm({ name: user.name, email: user.email, role: user.role, password: '', isActive: user.isActive }); setSelectedPerms(user.customPermissions || []); }
    else { setForm({ name: '', email: '', role: 'Viewer', password: '', isActive: true }); setSelectedPerms([]); }
    setErrors({}); setShowPassword(false);
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    if (!user && !form.password) errs.password = 'Password required for new users';
    if (form.password && form.password.length < 8) errs.password = 'Min 8 characters';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const payload: any = { ...form, customPermissions: selectedPerms };
      if (!form.password) delete payload.password;
      if (user) await api.put(`/users/${user._id}`, payload);
      else await api.post('/users', payload);
      onSaved(); onClose();
    } catch (err: any) { setErrors({ api: err.response?.data?.message || 'Failed to save user' }); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{user ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errors.api && <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">{errors.api}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm" placeholder="Enter full name" />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm" placeholder="user@company.com" />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Role *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm">
                <option value="Viewer">Viewer — Read-only access</option>
                <option value="Manager">Manager — Full operational access</option>
                <option value="Admin">Admin — Full system access</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password {user ? '(leave blank to keep)' : '*'}</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
                  placeholder={user ? '••••••••' : 'Min 8 characters'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-800/50 rounded-xl p-4">
            <div>
              <div className="text-white text-sm font-medium">Account Active</div>
              <div className="text-slate-400 text-xs">Inactive users cannot log in</div>
            </div>
            <button type="button" onClick={() => setForm({ ...form, isActive: !form.isActive })}
              className={`w-12 h-6 rounded-full transition-all duration-200 relative ${form.isActive ? 'bg-sky-600' : 'bg-slate-600'}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200 ${form.isActive ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {form.role !== 'Admin' && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><Key className="w-4 h-4 text-sky-400" /><span className="text-white font-medium text-sm">Custom Permissions</span></div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allPermissions.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <div onClick={() => setSelectedPerms(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key])}
                      className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedPerms.includes(key) ? 'bg-sky-500 border-sky-500' : 'border-slate-600 bg-slate-700 group-hover:border-sky-500/50'}`}>
                      {selectedPerms.includes(key) && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-slate-300 text-xs group-hover:text-white transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium transition-all text-sm disabled:opacity-60 flex items-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {user ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const UserListPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { firms } = useFirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users', { params: { page, limit: 10, search, role: roleFilter } });
      const d = res.data.data;
      setUsers(d.users || d.data || []);
      setPagination({ total: d.pagination?.total || 0, totalPages: d.pagination?.totalPages || 1 });
    } catch { setUsers([]); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleDelete = async (user: User) => {
    if (user._id === currentUser?._id) { alert('You cannot delete your own account.'); return; }
    if (!confirm(`Delete user "${user.name}"?`)) return;
    try { await api.delete(`/users/${user._id}`); fetchUsers(); }
    catch { alert('Failed to delete user'); }
  };

  const handleToggleActive = async (user: User) => {
    if (user._id === currentUser?._id) { alert('You cannot deactivate your own account.'); return; }
    try { await api.patch(`/users/${user._id}/toggle-status`); fetchUsers(); }
    catch { alert('Failed to update user status'); }
  };

  const columns: Column<User>[] = [
    {
      header: 'User',
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-white font-medium text-sm">{u.name}</div>
            <div className="text-slate-500 text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      cell: (u) => (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleColors[u.role] || 'text-slate-400 bg-slate-500/10 border-slate-500/30'}`}>
          <Shield className="w-3 h-3" />{u.role}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (u) => (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.isActive ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-700/50'}`}>
          {u.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
          {u.isActive ? 'Active' : 'Inactive'}
        </div>
      ),
    },
    ...(firms.length >= 2 ? [{
      header: 'Firm Access',
      cell: (u: User) => u.firmAccessMode === 'Restricted'
        ? <FirmBadges firms={u.firmAccess || []} />
        : <span className="text-xs text-slate-500 italic">All firms</span>,
    }] : []),
    {
      header: 'Last Login',
      cell: (u: User) => <span className="text-slate-400 text-sm">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}</span>,
    },
    {
      header: 'Created',
      cell: (u) => <span className="text-slate-400 text-sm">{new Date(u.createdAt).toLocaleDateString('en-IN')}</span>,
    },
    {
      header: 'Actions',
      cell: (u) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleToggleActive(u)}
            className={`p-1.5 rounded-lg transition-all ${u.isActive ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
            title={u.isActive ? 'Deactivate' : 'Activate'}>
            {u.isActive ? <Lock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </button>
          <button onClick={() => { setSelectedUser(u); setModalOpen(true); }}
            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(u)} disabled={u._id === currentUser?._id}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage system users, roles, and granular permissions for enterprise access control"
        onAddClick={() => { setSelectedUser(null); setModalOpen(true); }}
        addLabel="Add User"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={pagination.total} icon={<Users className="w-5 h-5" />} colorScheme="blue" />
        <StatCard title="Active" value={users.filter(u => u.isActive).length} icon={<UserCheck className="w-5 h-5" />} colorScheme="emerald" />
        <StatCard title="Admins" value={users.filter(u => u.role === 'Admin').length} icon={<Shield className="w-5 h-5" />} colorScheme="rose" />
        <StatCard title="Managers" value={users.filter(u => u.role === 'Manager').length} icon={<Users className="w-5 h-5" />} colorScheme="indigo" />
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search users..."
        pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        emptyMessage="No users found."
        filters={
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none">
            <option value="">All Roles</option>
            {['Admin', 'Manager', 'Viewer'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        }
      />

      <UserFormModal open={modalOpen} onClose={() => setModalOpen(false)} user={selectedUser} onSaved={fetchUsers} />
    </div>
  );
};
