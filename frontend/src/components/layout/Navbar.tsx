import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  LogOut,
  User,
  Shield,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';
import { Link } from 'react-router-dom';
import { FirmSwitcher } from '../firm/FirmSwitcher';

interface NavbarProps {
  sidebarCollapsed: boolean;
  onMobileMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ sidebarCollapsed, onMobileMenuClick }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data?.data) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.meta?.unreadCount || 0);
      }
    } catch (e) {
      // quiet fail on poller
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header
      className={`h-16 fixed top-0 right-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 transition-all duration-300 flex items-center justify-between px-4 md:px-6 left-0 ${
        sidebarCollapsed ? 'md:left-20' : 'md:left-64'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMobileMenuClick}
          className="p-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800 transition md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Firm scope switcher */}
        <FirmSwitcher />
      </div>

      {/* Global Quick Search — hidden on mobile */}
      <div className="relative w-72 hidden md:block">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Global search (Tenders, Vehicles, Work Orders)..."
          className="w-full pl-10 pr-4 py-1.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition"
        />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800 relative transition"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 glass-panel rounded-2xl border border-slate-800 shadow-2xl py-3 z-50 animate-fade-in">
              <div className="px-4 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">No new notifications</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-3.5 hover:bg-slate-800/40 transition ${!n.isRead ? 'bg-sky-950/20' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200">{n.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => setShowNotifications(false)}
                          className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:underline mt-1.5 font-medium"
                        >
                          View Details <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 transition"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {user?.name?.slice(0, 2).toUpperCase() || 'DM'}
            </div>
            <span className="text-xs font-medium text-slate-200 hidden sm:inline">{user?.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl border border-slate-800 shadow-2xl py-2 z-50 animate-fade-in">
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="text-xs font-semibold text-slate-200">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-400 font-mono border border-sky-500/30">
                  {user?.role}
                </span>
              </div>

              <Link
                to="/settings"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800/60 hover:text-white transition"
              >
                <Shield className="w-4 h-4 text-sky-400" />
                <span>Account & Settings</span>
              </Link>

              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
