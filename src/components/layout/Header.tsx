import React, { useState } from 'react';
import {
  Beer,
  Zap,
  ShoppingCart,
  Bookmark,
  Package,
  Clock,
  ShieldCheck,
  BarChart3,
  Sliders,
  Wifi,
  WifiOff,
  Bell,
  Search,
  UserCheck,
  ChevronDown,
  X,
  RefreshCw,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { usePubStore } from '../../services/store';
import { Role } from '../../types';
import { VoiceOrderMicrophone } from '../voice/VoiceOrderMicrophone';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openGlobalSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab, openGlobalSearch }) => {
  const {
    currentUser,
    users,
    switchUser,
    isOnline,
    toggleNetworkStatus,
    offlineQueueCount,
    syncOfflineQueue,
    notifications,
    markNotificationAsRead,
    currentShift,
    settings,
  } = usePubStore();

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read);

  // Role badge color
  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return 'bg-amber-900/60 text-amber-300 border-amber-700/50';
      case 'manager':
        return 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50';
      case 'supervisor':
        return 'bg-blue-900/60 text-blue-300 border-blue-700/50';
      case 'waiter':
        return 'bg-purple-900/60 text-purple-300 border-purple-700/50';
    }
  };

  const navItems = [
    { id: 'pos', label: 'POS Terminal', icon: ShoppingCart, roles: ['admin', 'manager', 'supervisor', 'waiter'] },
    { id: 'quicksale', label: 'Quick Sale', icon: Zap, roles: ['admin', 'manager', 'supervisor', 'waiter'] },
    { id: 'tabs', label: 'Customer Tabs', icon: Bookmark, roles: ['admin', 'manager', 'supervisor', 'waiter'] },
    { id: 'inventory', label: 'Inventory Hub', icon: Package, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'operations', label: 'Operations & Approvals', icon: ShieldCheck, roles: ['admin', 'manager', 'supervisor'] },
    { id: 'shifts', label: 'Shifts & Staff', icon: Clock, roles: ['admin', 'manager', 'supervisor', 'waiter'] },
    { id: 'analytics', label: 'Management BI', icon: BarChart3, roles: ['admin', 'manager'] },
    { id: 'settings', label: 'Settings & Audit', icon: Sliders, roles: ['admin'] },
  ];

  const visibleNavItems = navItems.filter((item) => item.roles.includes(currentUser.role));

  return (
    <header className="bg-[#0e0e11]/95 backdrop-blur-xl border-b border-white/5 text-[#e0e0e4] sticky top-0 z-40 select-none shadow-2xl">
      {/* Top Bar */}
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Left: Brand / Title */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentTab('pos')}>
          <div className="w-10 h-10 rounded-2xl overflow-hidden bg-zinc-900 border border-white/15 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
            <img src="/logo.jpg" alt="Game of Thrones Pub Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-lg text-white uppercase">
                {settings.pubName}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                THE IRON SAVANNAH
              </span>
            </div>
            <p className="text-[11px] text-white/40 hidden sm:block tracking-wide">Nairobi, Kenya • Est. 2026</p>
          </div>
        </div>

        {/* Center: Global Search & Shortcut */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <button
            onClick={openGlobalSearch}
            className="w-full bg-[#141417] hover:bg-[#1a1a1e] text-white/40 hover:text-white/80 border border-white/5 rounded-2xl px-4 py-2 text-xs flex items-center justify-between transition-all shadow-inner"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Search POS...</span>
            </div>
            <kbd className="bg-white/5 text-white/40 text-[10px] font-mono px-2 py-0.5 rounded-lg border border-white/10">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Actions & User Controls */}
        <div className="flex items-center gap-3">
          {/* Shift status pill */}
          <button
            onClick={() => setCurrentTab('shifts')}
            className={`hidden sm:flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-2xl border transition-all ${
              currentShift
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${currentShift ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
            <span className="font-mono">{currentShift ? 'Shift Active' : 'No Open Shift'}</span>
          </button>

          {/* Hands-free Voice Mic Button */}
          <VoiceOrderMicrophone
            compact={true}
            defaultTarget={currentTab === 'tabs' ? 'TAB' : 'POS'}
          />

          {/* Network Resilience Status */}
          <div className="flex items-center">
            <button
              onClick={toggleNetworkStatus}
              title={`Network mode: ${isOnline ? 'Online' : 'Offline simulation'}. Click to toggle.`}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-2xl border transition-all ${
                isOnline
                  ? 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
              <span className="text-[11px] font-mono font-medium hidden sm:inline">
                {isOnline ? 'ONLINE' : `OFFLINE (${offlineQueueCount})`}
              </span>
            </button>
            {!isOnline && offlineQueueCount > 0 && (
              <button
                onClick={syncOfflineQueue}
                title="Sync offline queue"
                className="ml-1 p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 rounded-xl border border-indigo-500/30"
              >
                <RefreshCw className="w-3 h-3 animate-spin" />
              </button>
            )}
          </div>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-mono font-bold flex items-center justify-center">
                  {unreadNotifs.length}
                </span>
              )}
            </button>

            {/* Notifications Bento Flyout */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#121214] border border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden p-3">
                <div className="p-3 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-indigo-400">Activity Log</span>
                    <span className="text-xs font-mono font-bold text-white/70">({notifications.length})</span>
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-white/40 hover:text-white p-1 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-white/5 p-1">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-white/40">Inventory levels and bar floor healthy.</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-2xl text-xs transition-colors cursor-pointer hover:bg-white/5 ${
                          !n.read ? 'bg-white/[0.03]' : ''
                        }`}
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          if (n.linkTab) setCurrentTab(n.linkTab);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-white flex items-center gap-2">
                            {n.severity === 'danger' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                            {n.severity === 'warning' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                            {n.severity === 'success' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                            {n.title}
                          </span>
                          <span className="text-[10px] font-mono text-white/40">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-white/60 leading-relaxed text-[11px]">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 p-1 sm:pl-1 sm:pr-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white transition-all"
            >
              <div
                className={`w-8 h-8 rounded-xl ${currentUser.avatarColor} flex items-center justify-center text-xs font-black text-white shadow-md`}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden lg:block leading-tight">
                <div className="text-xs font-bold text-white">{currentUser.name.split(' ')[0]}</div>
                <div className="text-[9px] text-indigo-400 font-mono uppercase tracking-widest">
                  {currentUser.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-white/40" />
            </button>

            {/* User Bento Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-3 w-64 bg-[#121214] border border-white/10 rounded-[2rem] shadow-2xl z-50 p-3 space-y-1">
                <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 border-b border-white/5 mb-1">
                  Active Operator
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchUser(u.id);
                      setShowUserDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                      u.id === currentUser.id
                        ? 'bg-indigo-600/20 text-white border border-indigo-500/30'
                        : 'hover:bg-white/5 text-white/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-xl ${u.avatarColor} flex items-center justify-center text-xs font-bold text-white`}
                      >
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">{u.name}</div>
                        <div className="text-[10px] font-mono text-white/40">PIN: {u.pin}</div>
                      </div>
                    </div>
                    <span
                      className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60"
                    >
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Bento Navigation Tabs */}
      <div className="border-t border-white/5 bg-[#0a0a0c] px-3 sm:px-6">
        <div className="max-w-[1600px] mx-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2 scrollbar-none">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/30 font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-white/40'}`} />
                <span>{item.label}</span>
                {item.id === 'operations' && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    OPS
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
