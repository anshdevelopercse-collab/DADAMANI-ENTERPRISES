import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { FirmProvider, useFirm } from '../../contexts/FirmContext';

const Inner: React.FC<{ sidebarCollapsed: boolean }> = ({ sidebarCollapsed }) => {
  const { activeScope } = useFirm();
  return (
    <main
      className={`flex-1 transition-all duration-300 pt-20 px-6 pb-12 ${
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* Key by scope so pages re-mount when the active firm changes */}
        <Outlet key={activeScope.kind === 'firm' ? activeScope.firmId : 'all'} />
      </div>
    </main>
  );
};

export const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <FirmProvider>
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <Navbar sidebarCollapsed={sidebarCollapsed} />
        <Inner sidebarCollapsed={sidebarCollapsed} />
      </div>
    </FirmProvider>
  );
};
