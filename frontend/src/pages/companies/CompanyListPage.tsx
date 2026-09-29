import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Edit2, Trash2, Plus } from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { CompanyFormModal } from './CompanyFormModal';
import { useAuth } from '../../contexts/AuthContext';

interface Company {
  _id: string;
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
  createdAt: string;
}

export const CompanyListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/companies', { params: { page, limit: 20, search: search || undefined } });
      setCompanies(res.data?.data || []);
      setPagination(res.data?.meta || { total: 0, totalPages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/companies/${deleteTarget._id}`);
      setDeleteTarget(null);
      fetchCompanies();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to delete entity');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Company>[] = [
    {
      header: 'Firm',
      cell: (c) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-100">{c.name}</span>
            {c.isPrimary && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                primary
              </span>
            )}
          </div>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400">{c.code}</span>
        </div>
      ),
    },
    {
      header: 'Identifiers',
      cell: (c) => (
        <div className="space-y-0.5 text-xs">
          {c.gstNumber && <div className="text-slate-300"><span className="text-slate-500">GST:</span> {c.gstNumber}</div>}
          {c.panNumber && <div className="text-slate-300"><span className="text-slate-500">PAN:</span> {c.panNumber}</div>}
          {c.registrationNumber && <div className="text-slate-300"><span className="text-slate-500">Reg:</span> {c.registrationNumber}</div>}
          {!c.gstNumber && !c.panNumber && !c.registrationNumber && <span className="text-slate-600 italic">—</span>}
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: (c) => (
        <div className="text-xs">
          <div className="text-slate-300">{c.email}</div>
          <div className="text-slate-400">{c.phone}</div>
        </div>
      ),
    },
    {
      header: 'Location',
      cell: (c) => (
        <div className="text-xs">
          <div className="text-slate-300">{c.city}</div>
          <div className="text-slate-400">{c.state}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (c) => <StatusBadge status={c.isActive ? 'Active' : 'Inactive'} size="sm" />,
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          {hasPermission('company:manage') && (
            <>
              <button onClick={() => { setEditTarget(c); setFormOpen(true); }} title="Edit" className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => setDeleteTarget(c)} title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Firms"
        subtitle="Registered firms — used to assign tenders, contracts, vehicles and personnel"
        onAddClick={hasPermission('company:manage') ? () => { setEditTarget(null); setFormOpen(true); } : undefined}
        addLabel="Register Firm"
      />

      {/* Empty state notice when no entities configured */}
      {!loading && companies.length === 0 && (
        <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-sm">
          No legal entities configured yet. Entity assignment is pending confirmed company details.
          Existing contracts, vehicles, and workforce records are unaffected until entities are activated.
        </div>
      )}

      {loading ? (
        <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden">
          <SkeletonTableRows rows={4} columns={6} />
        </div>
      ) : companies.length === 0 ? (
        <div className="glass-card rounded-2xl border border-slate-800/80">
          <EmptyState
            icon={Building2}
            title="No entities registered"
            description="Register the legal entities whose names will appear on contracts and invoices."
            action={
              hasPermission('company:manage') && (
                <button
                  onClick={() => { setEditTarget(null); setFormOpen(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition"
                >
                  <Plus className="w-4 h-4" /> Register Entity
                </button>
              )
            }
          />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={companies}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search entities by name or code…"
          pagination={{ page, totalPages: pagination.totalPages, total: pagination.total, onPageChange: setPage }}
        />
      )}

      <CompanyFormModal
        isOpen={formOpen}
        companyToEdit={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSaved={fetchCompanies}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Delete entity "${deleteTarget?.name}"?`}
        description="This removes the entity record permanently. Existing contracts and workforce linked to this entity will retain their entity reference but the entity will no longer exist in the registry."
        confirmLabel="Delete Entity"
        isLoading={deleting}
      />
    </div>
  );
};
