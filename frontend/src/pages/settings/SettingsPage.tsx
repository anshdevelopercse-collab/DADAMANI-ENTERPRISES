import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Building2,
  Bell,
  Shield,
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Clock,
  Database,
  Loader,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/common/PageHeader';

interface SystemSettings {
  company: {
    name: string;
    registrationNumber: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    website: string;
    logo?: string;
  };
  notifications: {
    emailNotifications: boolean;
    tenderExpiryAlert: boolean;
    tenderExpiryDays: number;
    vehicleComplianceAlert: boolean;
    vehicleComplianceDays: number;
    workOrderDeadlineAlert: boolean;
    workOrderDeadlineDays: number;
  };
  security: {
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    requireOTPForAdmin: boolean;
    passwordMinLength: number;
    enforcePasswordExpiry: boolean;
    passwordExpiryDays: number;
  };
  system: {
    timezone: string;
    dateFormat: string;
    currency: string;
    locale: string;
    maintenanceMode: boolean;
  };
}

const defaultSettings: SystemSettings = {
  company: {
    name: 'Dada Mani Enterprise',
    registrationNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
  },
  notifications: {
    emailNotifications: true,
    tenderExpiryAlert: true,
    tenderExpiryDays: 7,
    vehicleComplianceAlert: true,
    vehicleComplianceDays: 30,
    workOrderDeadlineAlert: true,
    workOrderDeadlineDays: 3,
  },
  security: {
    sessionTimeoutMinutes: 480,
    maxLoginAttempts: 5,
    requireOTPForAdmin: true,
    passwordMinLength: 8,
    enforcePasswordExpiry: false,
    passwordExpiryDays: 90,
  },
  system: {
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    currency: 'INR',
    locale: 'en-IN',
    maintenanceMode: false,
  },
};

const tabs = [
  { id: 'company', label: 'Company', icon: <Building2 className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'system', label: 'System', icon: <Globe className="w-4 h-4" /> },
];

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}

const Toggle: React.FC<ToggleProps> = ({ value, onChange, label, description }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
    <div>
      <div className="text-white text-sm font-medium">{label}</div>
      {description && <div className="text-slate-400 text-xs mt-0.5">{description}</div>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-all duration-200 relative flex-shrink-0 ${value ? 'bg-sky-600' : 'bg-slate-600'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow transition-all duration-200 ${value ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({ label, value, onChange, min = 1, max = 9999, suffix }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
    <label className="text-white text-sm font-medium">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-sky-500"
      />
      {suffix && <span className="text-slate-400 text-sm">{suffix}</span>}
    </div>
  </div>
);

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState('company');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await api.get('/settings');
        if (res.data.data) {
          setSettings(prev => ({
            ...prev,
            ...res.data.data,
            company: { ...prev.company, ...res.data.data.company },
            notifications: { ...prev.notifications, ...res.data.data.notifications },
            security: { ...prev.security, ...res.data.data.security },
            system: { ...prev.system, ...res.data.data.system },
          }));
        }
      } catch {
        // Use defaults on error
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      await api.put('/settings', settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      await api.post('/settings/test-email');
      alert('Test email sent successfully! Check your configured email inbox.');
    } catch {
      alert('Failed to send test email. Check your email configuration.');
    } finally {
      setTestingEmail(false);
    }
  };

  const updateCompany = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, company: { ...prev.company, [field]: value } }));
  };

  const updateNotification = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, notifications: { ...prev.notifications, [field]: value } }));
  };

  const updateSecurity = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, security: { ...prev.security, [field]: value } }));
  };

  const updateSystem = (field: string, value: any) => {
    setSettings(prev => ({ ...prev, system: { ...prev.system, [field]: value } }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="System Settings" subtitle="Loading..." />
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        subtitle="Configure enterprise system preferences, notifications, security policies, and company information"
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all text-sm disabled:opacity-60 ${
            saveStatus === 'success'
              ? 'bg-emerald-600 text-white'
              : saveStatus === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40 hover:scale-105'
          }`}
        >
          {saving ? (
            <><Loader className="w-4 h-4 animate-spin" />Saving...</>
          ) : saveStatus === 'success' ? (
            <><CheckCircle2 className="w-4 h-4" />Saved!</>
          ) : saveStatus === 'error' ? (
            <><AlertTriangle className="w-4 h-4" />Error</>
          ) : (
            <><Save className="w-4 h-4" />Save Changes</>
          )}
        </button>
      </PageHeader>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-52 flex-shrink-0 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6">
          {/* Company Tab */}
          {activeTab === 'company' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-6">
                <Building2 className="w-5 h-5 text-sky-400" />
                <h3 className="text-white font-semibold">Company Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Company Name', placeholder: 'Dada Mani Enterprise' },
                  { key: 'registrationNumber', label: 'Registration Number', placeholder: 'CIN/GST Number' },
                  { key: 'phone', label: 'Phone', placeholder: '+91 XXXXX XXXXX' },
                  { key: 'email', label: 'Email', placeholder: 'info@company.com' },
                  { key: 'website', label: 'Website', placeholder: 'https://company.com' },
                  { key: 'address', label: 'Address', placeholder: 'Street Address' },
                  { key: 'city', label: 'City', placeholder: 'City' },
                  { key: 'state', label: 'State', placeholder: 'State' },
                  { key: 'pincode', label: 'PIN Code', placeholder: '000000' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
                    <input
                      type="text"
                      value={(settings.company as any)[key] || ''}
                      onChange={(e) => updateCompany(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-6">
                <Bell className="w-5 h-5 text-sky-400" />
                <h3 className="text-white font-semibold">Notification Settings</h3>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-4 space-y-1">
                <Toggle
                  label="Email Notifications"
                  description="Send email alerts for system events"
                  value={settings.notifications.emailNotifications}
                  onChange={(v) => updateNotification('emailNotifications', v)}
                />
                <Toggle
                  label="Tender Expiry Alerts"
                  description="Alert when tenders are about to expire"
                  value={settings.notifications.tenderExpiryAlert}
                  onChange={(v) => updateNotification('tenderExpiryAlert', v)}
                />
                <NumberInput
                  label="Tender Expiry Alert (days before)"
                  value={settings.notifications.tenderExpiryDays}
                  onChange={(v) => updateNotification('tenderExpiryDays', v)}
                  suffix="days"
                />
                <Toggle
                  label="Vehicle Compliance Alerts"
                  description="Alert when vehicle documents are expiring"
                  value={settings.notifications.vehicleComplianceAlert}
                  onChange={(v) => updateNotification('vehicleComplianceAlert', v)}
                />
                <NumberInput
                  label="Vehicle Compliance Alert (days before)"
                  value={settings.notifications.vehicleComplianceDays}
                  onChange={(v) => updateNotification('vehicleComplianceDays', v)}
                  suffix="days"
                />
                <Toggle
                  label="Work Order Deadline Alerts"
                  description="Alert when work order deadlines are approaching"
                  value={settings.notifications.workOrderDeadlineAlert}
                  onChange={(v) => updateNotification('workOrderDeadlineAlert', v)}
                />
                <NumberInput
                  label="Work Order Deadline Alert (days before)"
                  value={settings.notifications.workOrderDeadlineDays}
                  onChange={(v) => updateNotification('workOrderDeadlineDays', v)}
                  suffix="days"
                />
              </div>
              <div className="mt-4">
                <button
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-sm transition-all disabled:opacity-60"
                >
                  {testingEmail ? (
                    <><Loader className="w-4 h-4 animate-spin" />Sending...</>
                  ) : (
                    <><Mail className="w-4 h-4" />Send Test Email</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-6">
                <Shield className="w-5 h-5 text-sky-400" />
                <h3 className="text-white font-semibold">Security Policies</h3>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-4 space-y-1">
                <Toggle
                  label="Require OTP for Admin Login"
                  description="Admins must verify via email OTP"
                  value={settings.security.requireOTPForAdmin}
                  onChange={(v) => updateSecurity('requireOTPForAdmin', v)}
                />
                <NumberInput
                  label="Session Timeout"
                  value={settings.security.sessionTimeoutMinutes}
                  onChange={(v) => updateSecurity('sessionTimeoutMinutes', v)}
                  suffix="minutes"
                />
                <NumberInput
                  label="Max Login Attempts"
                  value={settings.security.maxLoginAttempts}
                  onChange={(v) => updateSecurity('maxLoginAttempts', v)}
                  max={20}
                />
                <NumberInput
                  label="Minimum Password Length"
                  value={settings.security.passwordMinLength}
                  onChange={(v) => updateSecurity('passwordMinLength', v)}
                  min={6}
                  max={32}
                  suffix="chars"
                />
                <Toggle
                  label="Enforce Password Expiry"
                  description="Force users to change password periodically"
                  value={settings.security.enforcePasswordExpiry}
                  onChange={(v) => updateSecurity('enforcePasswordExpiry', v)}
                />
                {settings.security.enforcePasswordExpiry && (
                  <NumberInput
                    label="Password Expiry Period"
                    value={settings.security.passwordExpiryDays}
                    onChange={(v) => updateSecurity('passwordExpiryDays', v)}
                    suffix="days"
                  />
                )}
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-6">
                <Globe className="w-5 h-5 text-sky-400" />
                <h3 className="text-white font-semibold">System Configuration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Timezone</label>
                  <select
                    value={settings.system.timezone}
                    onChange={(e) => updateSystem('timezone', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Dubai">Asia/Dubai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Date Format</label>
                  <select
                    value={settings.system.dateFormat}
                    onChange={(e) => updateSystem('dateFormat', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Currency</label>
                  <select
                    value={settings.system.currency}
                    onChange={(e) => updateSystem('currency', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm"
                  >
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Locale</label>
                  <select
                    value={settings.system.locale}
                    onChange={(e) => updateSystem('locale', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-sky-500 text-sm"
                  >
                    <option value="en-IN">en-IN (India)</option>
                    <option value="en-US">en-US (United States)</option>
                    <option value="en-GB">en-GB (United Kingdom)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-800/40 rounded-xl p-4">
                <Toggle
                  label="Maintenance Mode"
                  description="When enabled, only admins can access the system"
                  value={settings.system.maintenanceMode}
                  onChange={(v) => updateSystem('maintenanceMode', v)}
                />
              </div>

              {settings.system.maintenanceMode && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-amber-300 font-medium text-sm">Maintenance Mode Active</div>
                    <div className="text-amber-200/70 text-xs mt-0.5">
                      Non-admin users will be locked out of the system. Make sure to disable this when maintenance is complete.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
