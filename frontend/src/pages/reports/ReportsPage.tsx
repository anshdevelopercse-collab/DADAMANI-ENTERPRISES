import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  TrendingUp,
  FileText,
  Truck,
  ClipboardList,
  DollarSign,
  RefreshCw,
  Filter,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, notation: 'compact' }).format(v || 0);

const formatCurrencyFull = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-slate-300 text-sm font-medium mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="text-white font-semibold">
              {typeof p.value === 'number' && p.value > 100000 ? formatCurrencyFull(p.value) : p.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

interface ReportData {
  tendersByStatus: { _id: string; count: number }[];
  tendersByMonth: { month: string; count: number; value: number }[];
  vehiclesByStatus: { _id: string; count: number }[];
  vehiclesByType: { _id: string; count: number }[];
  workOrdersByStatus: { _id: string; count: number }[];
  workOrdersByPriority: { _id: string; count: number }[];
  awardedTendersByMonth: { month: string; count: number; value: number }[];
  financialSummary: {
    totalTenderValue: number;
    totalAwardedValue: number;
    totalWorkOrderBudget: number;
    totalActualCost: number;
  };
}

const reportSections = [
  { value: 'all', label: 'All Reports' },
  { value: 'tenders', label: 'Tenders' },
  { value: 'vehicles', label: 'Fleet' },
  { value: 'work-orders', label: 'Work Orders' },
  { value: 'financial', label: 'Financial' },
];

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports', {
        params: { from: dateRange.from, to: dateRange.to },
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const res = await api.get('/reports/export-pdf', {
        params: { from: dateRange.from, to: dateRange.to },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dada_mani_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await api.get('/reports/export-excel', {
        params: { from: dateRange.from, to: dateRange.to },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dada_mani_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Excel export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports & Analytics" subtitle="Loading..." />
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const tenderStatusData = (data?.tendersByStatus || []).map(d => ({ name: d._id, value: d.count }));
  const vehicleStatusData = (data?.vehiclesByStatus || []).map(d => ({ name: d._id, value: d.count }));
  const vehicleTypeData = (data?.vehiclesByType || []).map(d => ({ name: d._id, value: d.count }));
  const woStatusData = (data?.workOrdersByStatus || []).map(d => ({ name: d._id, value: d.count }));
  const woPriorityData = (data?.workOrdersByPriority || []).map(d => ({ name: d._id, value: d.count }));
  const monthlyTenders = data?.tendersByMonth || [];
  const monthlyAwarded = data?.awardedTendersByMonth || [];
  const financial = data?.financialSummary;

  const showTenders = activeSection === 'all' || activeSection === 'tenders';
  const showVehicles = activeSection === 'all' || activeSection === 'vehicles';
  const showWO = activeSection === 'all' || activeSection === 'work-orders';
  const showFinancial = activeSection === 'all' || activeSection === 'financial';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Business intelligence dashboards, KPI tracking, and exportable enterprise reports"
      >
        <div className="flex items-center gap-3">
          <button onClick={handleExportExcel} disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all text-sm disabled:opacity-60">
            <FileText className="w-4 h-4" />
            Export Excel
          </button>
          <button onClick={handleExportPDF} disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-all text-sm disabled:opacity-60">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 text-sm">Date Range:</span>
        </div>
        <input type="date" value={dateRange.from} onChange={(e) => setDateRange(d => ({ ...d, from: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm" />
        <span className="text-slate-500 text-sm">to</span>
        <input type="date" value={dateRange.to} onChange={(e) => setDateRange(d => ({ ...d, to: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500 text-sm" />
        <button onClick={fetchReports}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 text-sky-400 border border-sky-500/30 text-sm transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
          Apply
        </button>

        {/* Section Filter */}
        <div className="flex-1 flex justify-end">
          <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            {reportSections.map(s => (
              <button key={s.value} onClick={() => setActiveSection(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeSection === s.value ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Summary KPIs */}
      {showFinancial && financial && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Tender Value', value: formatCurrency(financial.totalTenderValue), icon: <FileText className="w-5 h-5" />, color: 'from-blue-600/20 to-blue-800/10 border-blue-500/20', text: 'text-blue-400' },
            { label: 'Awarded Contract Value', value: formatCurrency(financial.totalAwardedValue), icon: <TrendingUp className="w-5 h-5" />, color: 'from-emerald-600/20 to-emerald-800/10 border-emerald-500/20', text: 'text-emerald-400' },
            { label: 'Work Order Budget', value: formatCurrency(financial.totalWorkOrderBudget), icon: <ClipboardList className="w-5 h-5" />, color: 'from-purple-600/20 to-purple-800/10 border-purple-500/20', text: 'text-purple-400' },
            { label: 'Actual Cost Spent', value: formatCurrency(financial.totalActualCost), icon: <DollarSign className="w-5 h-5" />, color: 'from-amber-600/20 to-amber-800/10 border-amber-500/20', text: 'text-amber-400' },
          ].map(({ label, value, icon, color, text }) => (
            <div key={label} className={`bg-gradient-to-br ${color} border rounded-2xl p-5`}>
              <div className={`${text} mb-3`}>{icon}</div>
              <div className={`text-2xl font-bold ${text}`}>{value}</div>
              <div className="text-slate-400 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly Trends Chart */}
      {showTenders && monthlyTenders.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            Tender Pipeline — Monthly Trend
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyTenders}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Area yAxisId="left" type="monotone" dataKey="count" stroke="#0ea5e9" fill="url(#colorCount)" strokeWidth={2} name="Tenders" />
              <Area yAxisId="right" type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#colorValue)" strokeWidth={2} name="Value (₹)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tender Status Distribution */}
        {showTenders && tenderStatusData.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              Tender Status Distribution
            </h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={tenderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {tenderStatusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {tenderStatusData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-300 text-sm">{d.name}</span>
                    </div>
                    <span className="text-white font-semibold text-sm">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Vehicle Fleet Status */}
        {showVehicles && vehicleStatusData.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-400" />
              Fleet Status Overview
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vehicleStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis dataKey="name" type="category" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Vehicles" radius={[0, 4, 4, 0]}>
                  {vehicleStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Work Order Priority */}
        {showWO && woPriorityData.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-400" />
              Work Orders by Priority
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={woPriorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Work Orders" radius={[4, 4, 0, 0]}>
                  {woPriorityData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Awarded Tenders Monthly */}
        {showFinancial && monthlyAwarded.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Awarded Contract Value — Monthly
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyAwarded}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#475569" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#10b981" name="Awarded Value (₹)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Vehicle Type Breakdown */}
      {showVehicles && vehicleTypeData.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-6 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            Fleet Composition by Vehicle Type
          </h3>
          <div className="flex flex-wrap gap-3">
            {vehicleTypeData.map((d, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 min-w-[140px]">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <div>
                  <div className="text-slate-300 text-sm">{d.name}</div>
                  <div className="text-white font-bold text-lg">{d.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
