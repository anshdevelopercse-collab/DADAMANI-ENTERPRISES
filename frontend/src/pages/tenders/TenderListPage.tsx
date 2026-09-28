import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Eye,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  Clock,
  MapPin,
  IndianRupee,
} from 'lucide-react';
import { api } from '../../services/api';
import { Tender } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { TenderFormModal } from './TenderFormModal';

export const TenderListPage: React.FC = () => {
  const navigate = useNavigate();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);

  useEffect(() => {
    fetchTenders();
  }, [page, search, statusFilter, categoryFilter, showArchived]);

  const fetchTenders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tenders', {
        params: {
          page,
          limit: 10,
          search,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          isArchived: showArchived,
        },
      });
      if (res.data?.data) {
        setTenders(res.data.data);
        setPagination(res.data.meta);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveToggle = async (t: Tender) => {
    try {
      if (t.isArchived) {
        await api.patch(`/tenders/${t._id}/restore`);
      } else {
        await api.patch(`/tenders/${t._id}/archive`);
      }
      fetchTenders();
    } catch (e) {
      alert('Failed to update archive status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tender record permanently?')) return;
    try {
      await api.delete(`/tenders/${id}`);
      fetchTenders();
    } catch (e) {
      alert('Failed to delete tender');
    }
  };

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  const columns: Column<Tender>[] = [
    {
      header: 'Tender Info',
      cell: (row) => (
        <div>
          <div className="font-mono font-bold text-sky-400 text-xs">{row.tenderNumber}</div>
          <div className="font-medium text-white text-xs mt-0.5 line-clamp-1">{row.title}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">{row.clientName}</div>
        </div>
      ),
      width: '32%',
    },
    {
      header: 'Category & Location',
      cell: (row) => (
        <div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
            {row.category}
          </span>
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-slate-500" />
            <span className="truncate max-w-[150px]">{row.location}</span>
          </div>
        </div>
      ),
      width: '20%',
    },
    {
      header: 'Value & EMD',
      cell: (row) => (
        <div>
          <div className="font-semibold text-emerald-400 text-xs">{formatCurrency(row.estimatedValue)}</div>
          <div className="text-[10px] text-slate-400">EMD: {formatCurrency(row.earnestMoneyDeposit || 0)}</div>
        </div>
      ),
      width: '18%',
    },
    {
      header: 'Deadline & Status',
      cell: (row) => (
        <div>
          <StatusBadge status={row.status} size="sm" />
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{new Date(row.submissionDeadline).toLocaleDateString()}</span>
          </div>
        </div>
      ),
      width: '18%',
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => navigate(`/tenders/${row._id}`)}
            title="View Details & History"
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedTender(row);
              setModalOpen(true);
            }}
            title="Edit Tender"
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleArchiveToggle(row)}
            title={row.isArchived ? 'Restore' : 'Archive'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            title="Delete Permanently"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      width: '12%',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tender Management"
        subtitle="Manage end-to-end bidding pipeline, proposals, documents, and submission deadlines"
        moduleName="tenders"
        addLabel="New Tender Bid"
        onAddClick={() => {
          setSelectedTender(null);
          setModalOpen(true);
        }}
      />

      <DataTable
        columns={columns}
        data={tenders}
        loading={loading}
        searchPlaceholder="Search by tender no, client, title, location..."
        searchValue={search}
        onSearchChange={setSearch}
        pagination={{
          page,
          totalPages: pagination.totalPages,
          total: pagination.total,
          onPageChange: setPage,
        }}
        filters={
          <>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Awarded">Awarded</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="Logistics">Logistics</option>
              <option value="Mining">Mining</option>
              <option value="Construction">Construction</option>
              <option value="Transport">Transport</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>

            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                showArchived
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {showArchived ? 'Showing Archived' : 'Show Active Only'}
            </button>
          </>
        }
      />

      <TenderFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchTenders}
        tenderToEdit={selectedTender}
      />
    </div>
  );
};
