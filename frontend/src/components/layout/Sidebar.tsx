import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Award,
  Truck,
  ClipboardList,
  UploadCloud,
  FileText,
  BarChart3,
  History,
  Users,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Receipt,
  Banknote,
  BadgePercent,
  Building2,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { user, hasPermission } = useAuth();

  const navGroups: NavGroup[] = [
    { items: [{ name: 'Dashboard', href: '/', icon: LayoutDashboard }] },
    {
      label: 'Operations',
      items: [
        { name: 'Tenders', href: '/tenders', icon: FileSpreadsheet, permission: 'tender:read' },
        { name: 'Awarded Tenders', href: '/awarded', icon: Award, permission: 'awarded:read' },
        { name: 'Fleet & Vehicles', href: '/vehicles', icon: Truck, permission: 'vehicle:read' },
        { name: 'Workforce', href: '/workforce', icon: HardHat, permission: 'workforce:read' },
        { name: 'Work Orders', href: '/work-orders', icon: ClipboardList, permission: 'work_order:read' },
      ],
    },
    {
      label: 'Finance',
      items: [
        { name: 'Invoices', href: '/invoices', icon: Receipt, permission: 'invoice:read' },
        { name: 'Contract Advances', href: '/contract-advances', icon: Banknote, permission: 'advance:read' },
        { name: 'GEM Fees', href: '/gem-fees', icon: BadgePercent, permission: 'gemfee:read' },
      ],
    },
    {
      label: 'Documents & Data',
      items: [
        { name: 'Documents', href: '/documents', icon: FileText, permission: 'document:read' },
        { name: 'Excel Import Engine', href: '/excel-import', icon: UploadCloud, permission: 'import:data' },
      ],
    },
    {
      label: 'Reports',
      items: [{ name: 'Analytics & Reports', href: '/reports', icon: BarChart3 }],
    },
    {
      label: 'Administration',
      items: [
        { name: 'Firms', href: '/companies', icon: Building2, permission: 'company:read' },
        { name: 'Audit Trail', href: '/audit-logs', icon: History, permission: 'audit:read' },
        { name: 'User Management', href: '/users', icon: Users, permission: 'user:read' },
        { name: 'System Settings', href: '/settings', icon: Settings, permission: 'settings:manage' },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  const handleNavClick = () => {
    // Close mobile drawer when a link is clicked
    if (mobileOpen) onMobileClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 flex flex-col
          ${collapsed ? 'md:w-20' : 'md:w-64'}
          w-72
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-sky-600/30 shrink-0">
              DM
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-tight text-white uppercase font-sans">
                  Dada Mani
                </span>
                <span className="text-[10px] text-sky-400 font-semibold tracking-wider uppercase">
                  Enterprise Operations
                </span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition md:hidden"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition hidden md:block"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {visibleGroups.map((group, gIdx) => (
            <div key={group.label || `group-${gIdx}`}>
              {group.label && (!collapsed || mobileOpen) && (
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-sky-600/15 text-sky-400 border border-sky-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      } ${collapsed && !mobileOpen ? 'md:justify-center md:px-0' : ''}`
                    }
                    title={collapsed && !mobileOpen ? item.name : undefined}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${collapsed && !mobileOpen ? 'md:mx-auto' : ''}`} />
                    {(!collapsed || mobileOpen) && <span className="truncate">{item.name}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* User Role Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          {(!collapsed || mobileOpen) ? (
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
                {user?.name?.slice(0, 2).toUpperCase() || 'DM'}
              </div>
              <div className="flex flex-col truncate flex-1">
                <span className="text-xs font-semibold text-slate-200 truncate">{user?.name}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-sky-400" />
                  {user?.role}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-sky-400">
              {user?.name?.slice(0, 2).toUpperCase() || 'DM'}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
