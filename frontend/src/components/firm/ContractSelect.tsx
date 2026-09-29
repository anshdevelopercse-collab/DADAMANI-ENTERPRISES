import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { FirmBadge } from './FirmBadge';
import type { FirmField } from '../../types';

interface ContractOption {
  _id: string;
  orderNumber: string;
  title: string;
  firm?: FirmField;
}

interface ContractSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (contractId: string, firmId: string) => void;
  firmId?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const firmIdOf = (f?: FirmField): string => (!f ? '' : typeof f === 'string' ? f : f._id);

export const ContractSelect: React.FC<ContractSelectProps> = ({
  id,
  label = 'Contract (Work Order)',
  value,
  onChange,
  firmId,
  required,
  disabled,
  placeholder = '— Select contract —',
}) => {
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get('/work-orders', { params: { limit: 100 }, headers: { 'X-Firm-Scope': 'all' } })
      .then((r) => { if (active) setContracts(r.data?.data || []); })
      .catch(() => { if (active) setContracts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = firmId
    ? contracts.filter((c) => !firmIdOf(c.firm) || firmIdOf(c.firm) === firmId)
    : contracts;

  const selectedContract = contracts.find((c) => c._id === value);
  const contractFirmId = selectedContract ? firmIdOf(selectedContract.firm) : '';

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-400 mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const contract = contracts.find((c) => c._id === e.target.value);
          onChange(e.target.value, contract ? firmIdOf(contract.firm) : '');
        }}
        disabled={disabled || loading}
        className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
      >
        <option value="">{loading ? 'Loading…' : placeholder}</option>
        {filtered.map((c) => (
          <option key={c._id} value={c._id} disabled={!firmIdOf(c.firm)}>
            {c.orderNumber} — {c.title}{!firmIdOf(c.firm) ? ' (no firm — assign one first)' : ''}
          </option>
        ))}
      </select>
      {contractFirmId && (
        <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
          Financial records will be under <FirmBadge firm={selectedContract?.firm} size="md" />
        </p>
      )}
      {value && !contractFirmId && (
        <p className="text-[11px] text-amber-400 mt-1.5">
          This contract has no firm assigned — financial records cannot be created until one is set.
        </p>
      )}
    </div>
  );
};
