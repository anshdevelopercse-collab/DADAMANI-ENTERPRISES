import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Truck,
  IndianRupee,
  ClipboardList,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Plus,
  Upload,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatCard } from '../../components/common/StatCard';
import { Link } from 'react-router-dom';
import { useFirm } from '../../contexts/FirmContext';

export const DashboardPage: React.FC = () => {
  const { activeFirm } = useFirm();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/dashboard/metrics');
      if (res.data?.data) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load dashboard metrics', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString()}`;
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-400">Loading enterprise telemetry...</span>
        </div>
      </div>
    );
  }

  const { cards, recentActivity, upcomingExpiries } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner / Quick Welcome & Expiry Alert Notification */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            Operational Command Center
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-sans">
            {activeFirm ? `${activeFirm.name} Operations Hub` : 'Dada Mani Operations Hub'}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time telemetry across Tenders, Awarded Contracts, Fleet Compliance, and Mining/Logistics Work Orders.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 flex-wrap">
          <Link
            to="/excel-import"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Excel Import Wizard</span>
          </Link>
          <Link
            to="/tenders"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Tender Bid</span>
          </Link>
        </div>
      </div>

      {/* Compliance Expiry Urgent Banner */}
      {upcomingExpiries && upcomingExpiries.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-300">
                Fleet Compliance Alert: {upcomingExpiries.length} document(s) expiring within 30 days
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Urgent attention required for {upcomingExpiries[0].registrationNumber} ({upcomingExpiries[0].documentType}) expiring in {upcomingExpiries[0].daysLeft} days.
              </p>
            </div>
          </div>
          <Link
            to="/vehicles"
            className="text-xs font-semibold text-rose-400 hover:underline shrink-0"
          >
            View Fleet Registry →
          </Link>
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Tenders"
          value={cards.totalTenders}
          subtitle={`${cards.submittedTenders} Submitted | ${cards.awardedTenders} Awarded`}
          icon={<FileSpreadsheet className="w-5 h-5" />}
          colorScheme="blue"
        />
        <StatCard
          title="Awarded Revenue"
          value={formatCurrency(cards.totalRevenue)}
          subtitle={`Projected Profit: ${formatCurrency(cards.projectedProfit)} (${cards.profitMargin}%)`}
          icon={<IndianRupee className="w-5 h-5" />}
          colorScheme="emerald"
        />
        <StatCard
          title="Active Fleet"
          value={cards.activeVehicles}
          subtitle={`${cards.totalVehicles} Total Tippers, Trailers & Excavators`}
          icon={<Truck className="w-5 h-5" />}
          colorScheme="indigo"
        />
        <StatCard
          title="Active Work Orders"
          value={cards.activeWorkOrders}
          subtitle={`${cards.completedWorkOrders} Successfully Completed & Invoiced`}
          icon={<ClipboardList className="w-5 h-5" />}
          colorScheme="amber"
        />
      </div>

      {/* Bottom Row: Recent Audit Activity & Upcoming Fleet Expiries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Trail Feed */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Audit Stream
              </h3>
            </div>
            <Link to="/audit-logs" className="text-xs text-sky-400 hover:underline font-medium">
              View All Logs →
            </Link>
          </div>

          <div className="space-y-3">
            {recentActivity.map((log: any) => (
              <div
                key={log._id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start justify-between gap-3 text-xs hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{log.userName || 'System'}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-sky-400 border border-slate-700">
                      {log.module}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1">{log.description}</p>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet Compliance Expiries Table */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Fleet Compliance Expiries
              </h3>
            </div>
            <Link to="/vehicles" className="text-xs text-sky-400 hover:underline font-medium">
              Manage Fleet →
            </Link>
          </div>

          <div className="space-y-2.5">
            {upcomingExpiries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                All vehicle documents and permits are fully compliant.
              </div>
            ) : (
              upcomingExpiries.map((exp: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono">{exp.registrationNumber}</span>
                      <span className="text-slate-400">({exp.documentType})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {exp.makeModel} • {exp.currentLocation}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold font-mono ${
                        exp.daysLeft <= 7
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {exp.daysLeft <= 0 ? 'EXPIRED' : `${exp.daysLeft} Days Left`}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {new Date(exp.expiryDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
