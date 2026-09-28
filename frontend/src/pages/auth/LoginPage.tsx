import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, verifyOtp, resendOtp } = useAuth();

  const [email, setEmail] = useState('admin@dadamani.com');
  const [password, setPassword] = useState('Admin@123456');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (step === 'credentials') {
        const result = await login(email, password);
        if (result.requiresOtp) {
          setStep('otp');
          setInfoMessage(result.message || 'OTP sent to your registered email.');
          startCountdown();
        } else {
          navigate('/');
        }
      } else {
        await verifyOtp(email, otp);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    setResendCountdown(60);
    const interval = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setError(null);
    try {
      const msg = await resendOtp(email);
      setInfoMessage(msg);
      startCountdown();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleQuickFill = (role: 'admin' | 'manager' | 'viewer') => {
    if (role === 'admin') {
      setEmail('admin@dadamani.com');
      setPassword('Admin@123456');
    } else if (role === 'manager') {
      setEmail('manager@dadamani.com');
      setPassword('Manager@123456');
    } else {
      setEmail('viewer@dadamani.com');
      setPassword('Viewer@123456');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white font-black text-2xl shadow-xl shadow-sky-600/30 mb-4">
            DM
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-sans">
            Dada Mani Enterprise
          </h1>
          <p className="text-xs text-sky-400 font-semibold tracking-wider uppercase mt-1">
            Operations Management System
          </p>
        </div>

        {/* Login Box */}
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">
              {step === 'credentials' ? 'Sign in to Account' : 'Two-Factor Authentication'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {step === 'credentials'
                ? 'Enter your enterprise credentials to access the operational portal'
                : `Enter the 6-digit OTP code dispatched to ${email}`}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-2.5 text-xs text-sky-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'credentials' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition"
                      placeholder="name@dadamani.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500 transition"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  6-Digit Security OTP
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xl font-mono tracking-widest text-center text-sky-400 focus:outline-none focus:border-sky-500 transition"
                    placeholder="000000"
                    autoFocus
                  />
                </div>
                <div className="flex justify-between items-center mt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setStep('credentials')}
                    className="text-slate-400 hover:text-slate-200 underline"
                  >
                    Back to Login
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCountdown > 0}
                    className="text-sky-400 hover:underline disabled:opacity-40 disabled:no-underline font-medium"
                  >
                    {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-semibold text-sm shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{step === 'credentials' ? 'Authorize Session' : 'Verify & Enter Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credential Selector */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 text-center mb-3">
              One-Click Demo Credentials
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-center transition"
              >
                <div className="text-[11px] font-bold text-sky-400">Admin</div>
                <div className="text-[9px] text-slate-500">OTP via Email</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('manager')}
                className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-center transition"
              >
                <div className="text-[11px] font-bold text-emerald-400">Manager</div>
                <div className="text-[9px] text-slate-500">Direct Access</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('viewer')}
                className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-center transition"
              >
                <div className="text-[11px] font-bold text-amber-400">Viewer</div>
                <div className="text-[9px] text-slate-500">Read Only</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
