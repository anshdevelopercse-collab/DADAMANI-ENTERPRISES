import React, { useState, useEffect } from 'react';
import {
  Truck,
  ShieldAlert,
  Edit2,
  Trash2,
  Wrench,
  UserCheck,
  MapPin,
  History,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../services/api';
import { Vehicle, VehicleAllocation } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FirmBadge } from '../../components/firm/FirmBadge';
import { VehicleFormModal } from './VehicleFormModal';
import { Drawer } from '../../components/common/Drawer';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTableRows } from '../../components/common/Skeleton';
import { useAuth } from '../../contexts/AuthContext';

export const VehicleListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Vehicle Allocation History
  const [allocationTarget, setAllocationTarget] = useState<Vehicle | null>(null);
  const [allocations, setAllocations] = useState<VehicleAllocation[]>([]);
  const [allocationsLoading, setAllocationsLoading] = useState(false);

  const openAllocationHistory = async (vehicle: Vehicle) => {
    setAllocationTarget(vehicle);
    setAllocationsLoading(true);
    try {
      const res = await api.get(`/vehicles/${vehicle._id}/allocations`);
      setAllocations(res.data?.data || []);
    } catch (e) {
      console.error(e);
      setAllocations([]);
    } finally {
      setAllocationsLoading(false);
    }
  };

  // Maintenance Log Modal State
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceVehicle, setMaintenanceVehicle] = useState<Vehicle | null>(null);
  const [serviceType, setServiceType] = useState('Routine 10,000 KM Engine & Brake Overhaul');
  const [serviceCost, setServiceCost] = useState('45000');
  const [serviceCenter, setServiceCenter] = useState('Tata Authorized Workshop, Angul');

  useEffect(() => {
    fetchVehicles();
  }, [page, search, statusFilter, typeFilter]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/vehicles', {
        params: {
          page,
          limit: 10,
          search,
          status: statusFilter || undefined,
          vehicleType: typeFilter || undefined,
        },
      });
      if (res.data?.data) {
        setVehicles(res.data.data);
        setPagination(res.data.meta);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete vehicle registration permanently?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      fetchVehicles();
    } catch (e) {
      alert('Failed to delete vehicle');
    }
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceVehicle) return;
    try {
      await api.post(`/vehicles/${maintenanceVehicle._id}/maintenance`, {
        serviceDate: new Date(),
        odometerReading: maintenanceVehicle.odometerKm + 500,
        serviceType,
        cost: Number(serviceCost),
        serviceCenter,
      });
      setMaintenanceModalOpen(false);
      fetchVehicles();
    } catch (e) {
      alert('Failed to log maintenance');
    }
  };

  const getComplianceStatus = (v: Vehicle) => {
    const docs = [v.insurance, v.fitness, v.permit, v.tax, v.puc];
    const now = new Date();
    let hasExpired = false;
    let expiringSoon = false;

    docs.forEach((d) => {
      if (d && d.expiryDate) {
        const diff = (new Date(d.expiryDate).getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diff <= 0) hasExpired = true;
        else if (diff <= 30) expiringSoon = true;
      }
    });

    if (hasExpired) return { label: 'Doc Expired', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    if (expiringSoon) return { label: 'Expiry Alert', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    return { label: 'Compliant', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
  };

  const columns: Column<Vehicle>[] = [
    {
      header: 'Vehicle Registry',
      cell: (row) => (
        <div>
          <div className="font-mono font-bold text-white text-xs">{row.registrationNumber}</div>
          <div className="font-medium text-slate-300 text-xs mt-0.5">
            {row.make} {row.model} ({row.yearOfManufacture})
          </div>
          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-sky-400 border border-slate-700">
            {row.vehicleType} • {row.capacityTonnes} MT
          </span>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">Owner <FirmBadge firm={row.ownerFirm} /></div>
        </div>
      ),
      width: '30%',
    },
    {
      header: 'Location & Project',
      cell: (row) => (
        <div>
          <div className="text-xs text-slate-200 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-medium">{row.currentLocation}</span>
          </div>
          {row.assignedProject && (
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{row.assignedProject}</div>
          )}
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Odometer: {row.odometerKm.toLocaleString()} KM
          </div>
        </div>
      ),
      width: '24%',
    },
    {
      header: 'Pilot / Driver',
      cell: (row) => (
        <div>
          {row.assignedDriver ? (
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{row.assignedDriver.name}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Lic: {row.assignedDriver.licenseNumber}
              </div>
              <div className="text-[10px] text-slate-400">{row.assignedDriver.phone}</div>
            </div>
          ) : (
            <span className="text-xs text-slate-500 italic">No Pilot Assigned</span>
          )}
        </div>
      ),
      width: '20%',
    },
    {
      header: 'Status & Compliance',
      cell: (row) => {
        const comp = getComplianceStatus(row);
        return (
          <div>
            <StatusBadge status={row.status} size="sm" />
            <div className="mt-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${comp.color}`}>
                ● {comp.label}
              </span>
            </div>
          </div>
        );
      },
      width: '16%',
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {hasPermission('vehicle_allocation:read') && (
            <button
              onClick={() => openAllocationHistory(row)}
              title="Allocation history"
              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
            >
              <History className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setMaintenanceVehicle(row);
              setMaintenanceModalOpen(true);
            }}
            title="Log Maintenance"
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
          >
            <Wrench className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedVehicle(row);
              setModalOpen(true);
            }}
            title="Edit Vehicle"
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
      width: '12%',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Fleet & Heavy Equipment Registry"
        subtitle="Manage tippers, dumpers, trailers, excavators, pilot allocations, and RTO statutory renewals"
        moduleName="vehicles"
        addLabel="Register New Vehicle"
        onAddClick={() => {
          setSelectedVehicle(null);
          setModalOpen(true);
        }}
      />

      <DataTable
        columns={columns}
        data={vehicles}
        loading={loading}
        searchPlaceholder="Search by reg number, make, model, site location, driver..."
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
              <option value="">All Fleet Statuses</option>
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="">All Machinery Types</option>
              <option value="Dumper / Tipper">Dumper / Tipper</option>
              <option value="Truck 10-Wheeler">Truck 10-Wheeler</option>
              <option value="Trailer">Trailer</option>
              <option value="Excavator">Excavator</option>
              <option value="Bulldozer">Bulldozer</option>
            </select>
          </>
        }
      />

      <VehicleFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchVehicles}
        vehicleToEdit={selectedVehicle}
      />

      {/* Vehicle Allocation History Drawer */}
      <Drawer
        isOpen={!!allocationTarget}
        onClose={() => setAllocationTarget(null)}
        title={`${allocationTarget?.registrationNumber} — Allocation History`}
      >
        {allocationsLoading ? (
          <SkeletonTableRows rows={4} columns={3} />
        ) : allocations.length === 0 ? (
          <EmptyState
            title="No allocation history"
            description="This vehicle has not been assigned to any contract yet. A vehicle can only have one active allocation at a time."
          />
        ) : (
          <div className="space-y-3">
            {allocations.map((alloc) => {
              const wo = typeof alloc.workOrder === 'string' ? null : alloc.workOrder;
              const by = typeof alloc.assignedBy === 'string' ? null : alloc.assignedBy;
              const isActive = alloc.status === 'Active';
              return (
                <div key={alloc._id} className={`p-4 rounded-xl border ${isActive ? 'border-sky-500/30 bg-sky-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-100">{wo ? `${wo.orderNumber} — ${wo.title}` : 'Work order'}</span>
                    <StatusBadge status={alloc.status} size="sm" />
                  </div>
                  {wo && <div className="text-[11px] text-slate-400 mt-0.5">{wo.clientName}</div>}
                  <div className="text-xs text-slate-400 mt-1.5">
                    {new Date(alloc.startDate).toLocaleDateString('en-IN')}
                    {' → '}
                    {alloc.endDate ? new Date(alloc.endDate).toLocaleDateString('en-IN') : <span className="text-sky-400">ongoing</span>}
                  </div>
                  {by && <div className="text-[11px] text-slate-500 mt-1">Assigned by: {by.name}</div>}
                  {alloc.notes && <p className="text-xs text-slate-400 mt-1.5 italic">{alloc.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Drawer>

      {/* Maintenance Modal */}
      {maintenanceModalOpen && maintenanceVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-slate-800 shadow-2xl relative">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Log Maintenance Service
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Vehicle: <span className="font-mono text-sky-400">{maintenanceVehicle.registrationNumber}</span>
            </p>

            <form onSubmit={handleLogMaintenance} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Service Type</label>
                <input
                  type="text"
                  required
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Service Center</label>
                <input
                  type="text"
                  required
                  value={serviceCenter}
                  onChange={(e) => setServiceCenter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-semibold mb-1">Total Cost (₹)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={serviceCost}
                  onChange={(e) => setServiceCost(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMaintenanceModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
                >
                  Record Maintenance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
