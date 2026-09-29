import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export interface FirmInfo {
  _id: string;
  name: string;
  code: string;
  isPrimary?: boolean;
  isActive: boolean;
}

export type ScopeKind = 'all' | 'firm';

export interface ActiveScope {
  kind: ScopeKind;
  firmId?: string;
}

interface FirmContextValue {
  firms: FirmInfo[];
  primaryFirmId: string;
  accessMode: 'All' | 'Restricted';
  activeScope: ActiveScope;
  setActiveScope: (s: ActiveScope) => void;
  /** Pre-selected firm id for new records. Uses active firm or primary. */
  defaultFirmId: string;
  activeFirm: FirmInfo | undefined;
  loading: boolean;
  reload: () => void;
}

const FirmContext = createContext<FirmContextValue>({
  firms: [],
  primaryFirmId: '',
  accessMode: 'All',
  activeScope: { kind: 'all' },
  setActiveScope: () => {},
  defaultFirmId: '',
  activeFirm: undefined,
  loading: true,
  reload: () => {},
});

export const useFirm = () => useContext(FirmContext);

const SCOPE_KEY = (userId: string) => `dada_mani_firm_scope_${userId}`;

function loadPersistedScope(userId: string): ActiveScope {
  try {
    const raw = localStorage.getItem(SCOPE_KEY(userId));
    if (raw) return JSON.parse(raw) as ActiveScope;
  } catch {}
  return { kind: 'all' };
}

function buildHeaderValue(scope: ActiveScope): string {
  if (scope.kind === 'firm' && scope.firmId) return `firm:${scope.firmId}`;
  return 'all';
}

export function setApiFirmScope(scope: ActiveScope) {
  const value = buildHeaderValue(scope);
  api.defaults.headers.common['X-Firm-Scope'] = value;
}

export const FirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [firms, setFirms] = useState<FirmInfo[]>([]);
  const [primaryFirmId, setPrimaryFirmId] = useState('');
  const [accessMode, setAccessMode] = useState<'All' | 'Restricted'>('All');
  const [activeScope, _setActiveScope] = useState<ActiveScope>({ kind: 'all' });
  const [loading, setLoading] = useState(true);

  const setActiveScope = useCallback((s: ActiveScope) => {
    _setActiveScope(s);
    setApiFirmScope(s);
    if (user?._id) {
      try { localStorage.setItem(SCOPE_KEY(user._id), JSON.stringify(s)); } catch {}
    }
  }, [user?._id]);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/companies/context');
      const { firms: fs, primaryFirmId: pid, accessMode: mode } = res.data?.data || {};
      setFirms(fs || []);
      setPrimaryFirmId(pid || '');
      setAccessMode(mode || 'All');

      const persisted = loadPersistedScope(user._id);
      const validFirmIds = (fs || []).map((f: FirmInfo) => f._id);
      const restored: ActiveScope =
        persisted.kind === 'firm' && persisted.firmId && validFirmIds.includes(persisted.firmId)
          ? persisted
          : { kind: 'all' };
      _setActiveScope(restored);
      setApiFirmScope(restored);
    } catch {
      // On error show everything
      _setActiveScope({ kind: 'all' });
      setApiFirmScope({ kind: 'all' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const activeFirm = activeScope.kind === 'firm' ? firms.find((f) => f._id === activeScope.firmId) : undefined;
  const defaultFirmId = activeScope.kind === 'firm' && activeScope.firmId ? activeScope.firmId : primaryFirmId;

  return (
    <FirmContext.Provider value={{ firms, primaryFirmId, accessMode, activeScope, setActiveScope, defaultFirmId, activeFirm, loading, reload }}>
      {children}
    </FirmContext.Provider>
  );
};
