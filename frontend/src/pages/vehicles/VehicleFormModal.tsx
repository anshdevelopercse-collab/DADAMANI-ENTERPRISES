import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { Vehicle } from '../../types';
import { useFirm } from '../../contexts/FirmContext';
import { FirmSelect } from '../../components/firm/FirmSelect';

const firmIdOf = (f: any): string => (!f ? '' : typeof f === 'string' ? f : f._id);

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicleToEdit?: Vehicle | null;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  vehicleToEdit,
}) => {
  const { defaultFirmId } = useFirm();
  const [ownerFirm, setOwnerFirm] = useState('');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    registrationNumber: '',
    chassisNumber: '',
    engineNumber: '',
    make: 'Tata Motors',
    model: 'Prima 2830.K',
    yearOfManufacture: 2024,
    vehicleType: 'Dumper / Tipper',
    fuelType: 'Diesel',
    capacityTonnes: 28,
    odometerKm: 0,
    status: 'Active',
    currentLocation: 'MCL Talcher Mines',
    assignedProject: 'Coal Evacuation Project',
    assignedDriver: '',
    insuranceExpiry: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
    fitnessExpiry: new Date(Date.now() + 240 * 86400000).toISOString().split('T')[0],
    permitExpiry: new Date(Date.now() + 300 * 86400000).toISOString().split('T')[0],
    taxExpiry: new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0],
    pucExpiry: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
    setOwnerFirm(vehicleToEdit ? firmIdOf(vehicleToEdit.ownerFirm) : defaultFirmId);
    if (vehicleToEdit) {
      setFormData({
        registrationNumber: vehicleToEdit.registrationNumber,
        chassisNumber: vehicleToEdit.chassisNumber,
        engineNumber: vehicleToEdit.engineNumber,
        make: vehicleToEdit.make,
        model: vehicleToEdit.model,
        yearOfManufacture: vehicleToEdit.yearOfManufacture,
        vehicleType: vehicleToEdit.vehicleType,
        fuelType: vehicleToEdit.fuelType,
        capacityTonnes: vehicleToEdit.capacityTonnes,
        odometerKm: vehicleToEdit.odometerKm,
        status: vehicleToEdit.status,
        currentLocation: vehicleToEdit.currentLocation,
        assignedProject: vehicleToEdit.assignedProject || '',
        assignedDriver: vehicleToEdit.assignedDriver?._id || '',
        insuranceExpiry: vehicleToEdit.insurance?.expiryDate?.split('T')[0] || '',
        fitnessExpiry: vehicleToEdit.fitness?.expiryDate?.split('T')[0] || '',
        permitExpiry: vehicleToEdit.permit?.expiryDate?.split('T')[0] || '',
        taxExpiry: vehicleToEdit.tax?.expiryDate?.split('T')[0] || '',
        pucExpiry: vehicleToEdit.puc?.expiryDate?.split('T')[0] || '',
      });
    }
  }, [vehicleToEdit, isOpen]);

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/vehicles/drivers/list?limit=50');
      if (res.data?.data) {
        setDrivers(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vehicleToEdit && !ownerFirm) {
      setError('Select the firm that owns this vehicle');
      return;
    }
    setLoading(true);

    const docNo = (key: 'insurance' | 'fitness' | 'permit' | 'tax' | 'puc') =>
      vehicleToEdit?.[key]?.documentNumber ?? '';

    try {
      const payload: any = {
        ...formData,
        yearOfManufacture: Number(formData.yearOfManufacture),
        capacityTonnes: Number(formData.capacityTonnes),
        odometerKm: Number(formData.odometerKm),
        assignedDriver: formData.assignedDriver || undefined,
        insurance: { expiryDate: formData.insuranceExpiry, documentNumber: docNo('insurance') },
        fitness: { expiryDate: formData.fitnessExpiry, documentNumber: docNo('fitness') },
        permit: { expiryDate: formData.permitExpiry, documentNumber: docNo('permit') },
        tax: { expiryDate: formData.taxExpiry, documentNumber: docNo('tax') },
        puc: { expiryDate: formData.pucExpiry, documentNumber: docNo('puc') },
      };
      if (ownerFirm) payload.ownerFirm = ownerFirm;

      if (vehicleToEdit) {
        await api.put(`/vehicles/${vehicleToEdit._id}`, payload);
      } else {
        await api.post('/vehicles', payload);
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
          {vehicleToEdit ? 'Edit Vehicle Registry' : 'Register New Fleet Asset'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Record heavy transport machinery specs and mandatory RTO compliance expiry dates
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FirmSelect
            id="vehicle-owner-firm"
            label="Owning firm"
            value={ownerFirm}
            onChange={setOwnerFirm}
            hint="The firm that owns this vehicle. It can still be deployed on another firm's contract; each allocation records both firms."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Reg Number (Plate) *
              </label>
              <input
                type="text"
                required
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none font-mono uppercase"
                placeholder="OD-02-AX-9999"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Make (Manufacturer) *
              </label>
              <input
                type="text"
                required
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Model *
              </label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Vehicle Type
              </label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="Dumper / Tipper">Dumper / Tipper</option>
                <option value="Truck 10-Wheeler">Truck 10-Wheeler</option>
                <option value="Trailer">Trailer</option>
                <option value="Excavator">Excavator</option>
                <option value="Bulldozer">Bulldozer</option>
                <option value="Water Tanker">Water Tanker</option>
                <option value="Transit Mixer">Transit Mixer</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Capacity (Tonnes) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.capacityTonnes}
                onChange={(e) => setFormData({ ...formData, capacityTonnes: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Odometer (KM / Hours)
              </label>
              <input
                type="number"
                min={0}
                value={formData.odometerKm}
                onChange={(e) => setFormData({ ...formData, odometerKm: Number(e.target.value) })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Current Site Location *
              </label>
              <input
                type="text"
                required
                value={formData.currentLocation}
                onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Assigned Pilot / Driver
              </label>
              <select
                value={formData.assignedDriver}
                onChange={(e) => setFormData({ ...formData, assignedDriver: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
              >
                <option value="">-- No Driver Assigned (Available) --</option>
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.licenseNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Compliance Expiry Fields */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              RTO Compliance Document Expiry Dates
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Insurance Expiry *</label>
                <input
                  type="date"
                  required
                  value={formData.insuranceExpiry}
                  onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Fitness Expiry *</label>
                <input
                  type="date"
                  required
                  value={formData.fitnessExpiry}
                  onChange={(e) => setFormData({ ...formData, fitnessExpiry: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Permit Expiry *</label>
                <input
                  type="date"
                  required
                  value={formData.permitExpiry}
                  onChange={(e) => setFormData({ ...formData, permitExpiry: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Road Tax Expiry *</label>
                <input
                  type="date"
                  required
                  value={formData.taxExpiry}
                  onChange={(e) => setFormData({ ...formData, taxExpiry: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">PUC Expiry *</label>
                <input
                  type="date"
                  required
                  value={formData.pucExpiry}
                  onChange={(e) => setFormData({ ...formData, pucExpiry: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200"
                />
              </div>
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
              <span>{vehicleToEdit ? 'Save Changes' : 'Register Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
