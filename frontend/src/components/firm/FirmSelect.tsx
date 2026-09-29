import React from 'react';
import { useFirm } from '../../contexts/FirmContext';

interface FirmSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (firmId: string) => void;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const FirmSelect: React.FC<FirmSelectProps> = ({
  id,
  label = 'Firm',
  value,
  onChange,
  required,
  hint,
  disabled,
  placeholder = '— Select firm —',
}) => {
  const { firms, loading } = useFirm();

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-400 mb-1.5">
        {label} {required && <span className="text-rose-400">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-50"
      >
        <option value="">{loading ? 'Loading firms…' : placeholder}</option>
        {firms.map((f) => (
          <option key={f._id} value={f._id}>
            {f.name} ({f.code}){f.isPrimary ? ' ★' : ''}
          </option>
        ))}
      </select>
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
};

interface FirmMultiSelectProps {
  id?: string;
  label?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  hint?: string;
}

export const FirmMultiSelect: React.FC<FirmMultiSelectProps> = ({
  id,
  label = 'Firms',
  value,
  onChange,
  hint,
}) => {
  const { firms } = useFirm();

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {firms.map((f) => {
          const selected = value.includes(f._id);
          return (
            <button
              key={f._id}
              type="button"
              onClick={() => toggle(f._id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                selected
                  ? 'bg-sky-600/20 text-sky-300 border-sky-500/50'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-600'
              }`}
            >
              {f.name} ({f.code})
            </button>
          );
        })}
      </div>
      {hint && <p className="text-[11px] text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
};
