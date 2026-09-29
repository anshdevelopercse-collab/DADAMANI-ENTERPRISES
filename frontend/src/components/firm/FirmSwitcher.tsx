import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { useFirm } from '../../contexts/FirmContext';

export const FirmSwitcher: React.FC = () => {
  const { firms, activeScope, setActiveScope, activeFirm, loading } = useFirm();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  if (loading || firms.length < 2) return null;

  const label = activeScope.kind === 'firm' && activeFirm ? activeFirm.name : 'All Firms';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 text-xs text-slate-200 transition focus:outline-none focus:ring-1 focus:ring-sky-500/50"
      >
        <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
        <span className="max-w-[160px] md:max-w-[220px] truncate font-medium">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 min-w-[260px] max-w-[340px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 py-2 animate-fade-in backdrop-blur-xl">
          <button
            onClick={() => { setActiveScope({ kind: 'all' }); setOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between gap-2 hover:bg-slate-800/60 ${activeScope.kind === 'all' ? 'text-sky-400 font-semibold bg-sky-950/20' : 'text-slate-300'}`}
          >
            <div className="flex flex-col">
              <span className="font-medium">All Firms</span>
              <span className="text-[10px] text-slate-400 font-normal">(combined view)</span>
            </div>
            {activeScope.kind === 'all' && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
          </button>
          <div className="border-t border-slate-800/80 my-1.5" />
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {firms.map((f) => {
              const isSelected = activeScope.kind === 'firm' && activeScope.firmId === f._id;
              return (
                <button
                  key={f._id}
                  onClick={() => { setActiveScope({ kind: 'firm', firmId: f._id }); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-xs transition flex items-center justify-between gap-3 hover:bg-slate-800/60 ${isSelected ? 'text-sky-400 font-semibold bg-sky-950/20' : 'text-slate-300'}`}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate font-medium">{f.name}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-normal">
                      <span className="font-mono text-slate-500">{f.code}</span>
                      {f.isPrimary && <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-sans">Primary</span>}
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
