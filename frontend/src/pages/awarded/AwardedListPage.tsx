import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  TrendingUp,
  Clock,
  Edit2,
  Trash2,
  FileText,
  Users,
} from 'lucide-react';
import { api } from '../../services/api';
import { AwardedTender } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AwardedFormModal } from './AwardedFormModal';

export const AwardedListPage: React.FC = () => {
  const [awardedList, setAwardedList] = useState<AwardedTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAwarded, setSelectedAwarded] = useState<AwardedTender | null>(null);

  useEffect(() => {
    fetchAwarded();
  }, [page, search, statusFilter]);

  const fetchAwarded = async () => {
    setLoading(true);
    try {
      const res = await api.get('/awarded-tenders', {
        params: {
          page,
          limit: 10,
          search,
          executionStatus: statusFilter || undefined,
        },
      });
      if (res.data?.data) {
        setAwardedList(res.data.data);
        setPagination(res.data.meta);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/awarded-tenders/${id}/approve`);
      fetchAwarded();
    } catch (e) {
      alert('Approval failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this awarded contract record?')) return;
    try {
      await api.delete(`/awarded-tenders/${id}`);
      fetchAwarded();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  const columns: Column<AwardedTender>[] = [
    {
      header: 'Contract & Tender',
      cell: (row) => (
        <div>
          <div className="font-mono font-bold text-sky-400 text-xs">{row.contractNumber}</div>
          <div className="font-medium text-white text-xs mt-0.5 line-clamp-1">{row.title}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{row.clientName}</div>
        </div>
      ),
      width: '32%',
    },
    {
      header: 'Financials & Margin',
      cell: (row) => (
        <div>
          <div className="font-bold text-emerald-400 text-xs">{formatCurrency(row.awardValue)}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
            <span>Profit: {formatCurrency(row.projectedProfit)}</span>
            <span className="font-semibold text-sky-400">({row.profitMarginPercent}%)</span>
          </div>
        </div>
      ),
      width: '22%',
    },
    {
      header: 'Timeline & Partners',
      cell: (row) => (
        <div>
          <div className="text-[11px] text-slate-300 font-mono">
            {new Date(row.startDate).toLocaleDateString()} → {new Date(row.completionDeadline).toLocaleDateString()}
          </div>
          {row.vendorPartners && row.vendorPartners.length > 0 && (
            <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[160px]">
              Vendors: {row.vendorPartners.join(', ')}
            </div>
          )}
        </div>
      ),
      width: '20%',
    },
    {
      header: 'Status & Approval',
      cell: (row) => (
        <div>
          <StatusBadge status={row.executionStatus} size="sm" />
          <div className="mt-1">
            <span
              className={`text-[10px] font-semibold ${
                row.approvalStatus === 'Approved' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              ● {row.approvalStatus}
            </span>
          </div>
        </div>
      ),
      width: '16%',
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.approvalStatus !== 'Approved' && (
            <button
              onClick={() => handleApprove(row._id)}
              title="Approve Contract Terms"
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setSelectedAwarded(row);
              setModalOpen(true);
            }}
            title="Edit Awarded Contract"
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            title="Delete Record"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      width: '10%',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Awarded Tenders & Contracts"
        subtitle="Manage awarded client contracts, project profit margins, vendor partner allocations, and milestone billing"
        moduleName="awarded"
        addLabel="Record Awarded Tender"
        onAddClick={() => {
          setSelectedAwarded(null);
          setModalOpen(true);
        }}
      />

      <DataTable
        columns={columns}
        data={awardedList}
        loading={loading}
        searchPlaceholder="Search by contract no, tender no, client, title..."
        searchValue={search}
        onSearchChange={setSearch}
        pagination={{
          page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: setPage,
        }}
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
          >
            <option value="">All Execution Statuses</option>
            <option value="Pending Kickoff">Pending Kickoff</option>
            <option value="In Progress">In Progress</option>
            <option value="On Track">On Track</option>
            <option value="Delayed">Delayed</option>
            <option value="Completed">Completed</option>
          </select>
        }
      />

      <AwardedFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchAwarded}
        awardedToEdit={selectedAwarded}
      />
    </div>
  );
};
