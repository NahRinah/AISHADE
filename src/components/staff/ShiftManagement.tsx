import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Banknote,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Play,
  User,
  Award,
  LogIn,
  LogOut,
  Timer,
  Users,
  Search,
  Check,
  Copy,
  X,
  FileText,
  Calendar,
} from 'lucide-react';
import { usePubStore } from '../../services/store';
import { User as UserType } from '../../types';

export interface StaffActivityLogEntry {
  id: string;
  userId: string;
  userName: string;
  role: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT';
  timestamp: string;
  notes?: string;
  durationMinutes?: number;
}

const INITIAL_STAFF_ACTIVITY: StaffActivityLogEntry[] = [
  {
    id: 'act-001',
    userId: 'user-supervisor-1',
    userName: 'Brienne of Tarth',
    role: 'supervisor',
    type: 'CLOCK_IN',
    timestamp: new Date(Date.now() - 5.5 * 3600 * 1000).toISOString(),
    notes: 'Floor Supervision & Cashier',
  },
  {
    id: 'act-002',
    userId: 'user-waiter-1',
    userName: 'Podrick Payne',
    role: 'waiter',
    type: 'CLOCK_IN',
    timestamp: new Date(Date.now() - 4.2 * 3600 * 1000).toISOString(),
    notes: 'Main Bar Floor Duty',
  },
  {
    id: 'act-003',
    userId: 'user-waiter-2',
    userName: 'Gendry Rivers',
    role: 'waiter',
    type: 'CLOCK_IN',
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    notes: 'Bar Prep & Stocking',
  },
  {
    id: 'act-004',
    userId: 'user-waiter-2',
    userName: 'Gendry Rivers',
    role: 'waiter',
    type: 'CLOCK_OUT',
    timestamp: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    notes: 'Morning Shift Completed',
    durationMinutes: 210,
  },
];

export const ShiftManagement: React.FC = () => {
  const {
    currentShift,
    shifts,
    startShift,
    closeShift,
    currentUser,
    users,
    sales,
    settings,
    logAudit,
    addNotification,
  } = usePubStore();

  const [openingCashInput, setOpeningCashInput] = useState<number>(5000);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [varianceExplanation, setVarianceExplanation] = useState<string>('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'drawer' | 'attendance' | 'leaderboard'>('drawer');

  // Staff activity attendance logs state
  const [activityLogs, setActivityLogs] = useState<StaffActivityLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('got_pub_staff_attendance_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_STAFF_ACTIVITY;
  });

  // Save activity logs
  useEffect(() => {
    try {
      localStorage.setItem('got_pub_staff_attendance_v1', JSON.stringify(activityLogs));
    } catch (e) {
      console.error(e);
    }
  }, [activityLogs]);

  // Live elapsed ticker
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // UI feedback & modals
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showClockModal, setShowClockModal] = useState(false);
  const [clockModalUser, setClockModalUser] = useState<UserType>(currentUser);
  const [clockModalAction, setClockModalAction] = useState<'CLOCK_IN' | 'CLOCK_OUT'>('CLOCK_IN');
  const [clockModalNote, setClockModalNote] = useState<string>('Main Bar Floor Duty');
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<'ALL' | 'CLOCK_IN' | 'CLOCK_OUT'>('ALL');
  const [copiedLog, setCopiedLog] = useState(false);

  // Helper to determine clock status of a staff member
  const getStaffClockStatus = (userId: string) => {
    const userLogs = activityLogs.filter((log) => log.userId === userId);
    if (userLogs.length === 0) return { isClockedIn: false, latestLog: null };
    const latestLog = userLogs[0];
    return {
      isClockedIn: latestLog.type === 'CLOCK_IN',
      latestLog,
    };
  };

  const currentUserClockStatus = getStaffClockStatus(currentUser.id);
  const isCurrentUserClockedIn = currentUserClockStatus.isClockedIn;

  // Format active duration
  const formatDuration = (startTimeIso: string) => {
    const diffMs = Math.max(0, currentTime - new Date(startTimeIso).getTime());
    const totalMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Clock In Action
  const handlePerformClockIn = (targetUser: UserType, note: string) => {
    const timestamp = new Date().toISOString();
    const cleanNote = note.trim() || `${targetUser.roleTitle || targetUser.role.toUpperCase()} Duty Started`;

    const newEntry: StaffActivityLogEntry = {
      id: `clock-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: targetUser.id,
      userName: targetUser.name,
      role: targetUser.role,
      type: 'CLOCK_IN',
      timestamp,
      notes: cleanNote,
    };

    setActivityLogs((prev) => [newEntry, ...prev]);

    // Central Audit Log entry
    logAudit(
      'STAFF_CLOCK_IN',
      'StaffAttendance',
      targetUser.id,
      null,
      { timestamp, status: 'CLOCKED_IN', user: targetUser.name },
      cleanNote
    );

    // Notification
    addNotification({
      type: 'APPROVAL_PENDING',
      title: `Staff Clock-In: ${targetUser.name}`,
      message: `${targetUser.name} clocked in at ${new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}.`,
      severity: 'success',
      linkTab: 'shifts',
    });

    setFeedbackMessage(
      `✓ ${targetUser.name} clocked in at ${new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`
    );
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // Clock Out Action
  const handlePerformClockOut = (targetUser: UserType, note: string) => {
    const status = getStaffClockStatus(targetUser.id);
    const clockedInAt = status.latestLog?.timestamp || new Date().toISOString();
    const durationMinutes = Math.max(1, Math.round((Date.now() - new Date(clockedInAt).getTime()) / (60 * 1000)));
    const timestamp = new Date().toISOString();

    const formattedDuration = `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`;
    const cleanNote = note.trim() || `Shift Completed (${formattedDuration})`;

    const newEntry: StaffActivityLogEntry = {
      id: `clock-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: targetUser.id,
      userName: targetUser.name,
      role: targetUser.role,
      type: 'CLOCK_OUT',
      timestamp,
      notes: cleanNote,
      durationMinutes,
    };

    setActivityLogs((prev) => [newEntry, ...prev]);

    // Central Audit Log entry
    logAudit(
      'STAFF_CLOCK_OUT',
      'StaffAttendance',
      targetUser.id,
      { clockedInAt },
      { timestamp, durationMinutes, status: 'CLOCKED_OUT', user: targetUser.name },
      cleanNote
    );

    // Notification
    addNotification({
      type: 'SHIFT_CLOSED',
      title: `Staff Clock-Out: ${targetUser.name}`,
      message: `${targetUser.name} clocked out at ${new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })} (Shift Duration: ${formattedDuration}).`,
      severity: 'warning',
      linkTab: 'shifts',
    });

    setFeedbackMessage(
      `✓ ${targetUser.name} clocked out at ${new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })} (Duration: ${formattedDuration})`
    );
    setTimeout(() => setFeedbackMessage(null), 4500);
  };

  // Toggle Current User Quick Clock In / Out
  const handleToggleCurrentUserClock = () => {
    if (isCurrentUserClockedIn) {
      // Clock Out
      setClockModalUser(currentUser);
      setClockModalAction('CLOCK_OUT');
      setClockModalNote('Shift Completed');
      setShowClockModal(true);
    } else {
      // Clock In
      setClockModalUser(currentUser);
      setClockModalAction('CLOCK_IN');
      setClockModalNote('Main Bar Floor Duty');
      setShowClockModal(true);
    }
  };

  // Filter sales done by current waiter today
  const mySalesToday = sales.filter((s) => s.waiterId === currentUser.id && s.status === 'PAID');
  const myTotalSales = mySalesToday.reduce((acc, s) => acc + s.total, 0);
  const myItemsSold = mySalesToday.reduce(
    (acc, s) => acc + s.items.reduce((sum, it) => sum + it.quantity, 0),
    0
  );
  const myAvgSale = mySalesToday.length > 0 ? Math.round(myTotalSales / mySalesToday.length) : 0;

  // Waiter leaderboard for management view
  const staffLeaderboard = users
    .filter((u) => u.role === 'waiter' || u.role === 'supervisor')
    .map((u) => {
      const uSales = sales.filter((s) => s.waiterId === u.id && s.status === 'PAID');
      const uTotal = uSales.reduce((acc, s) => acc + s.total, 0);
      const uVoids = sales.filter((s) => s.waiterId === u.id && s.status === 'VOIDED').length;
      return {
        ...u,
        totalSales: uTotal,
        transactionCount: uSales.length,
        avgOrder: uSales.length > 0 ? Math.round(uTotal / uSales.length) : 0,
        voidsCount: uVoids,
      };
    })
    .sort((a, b) => b.totalSales - a.totalSales);

  const handleStartShift = (e: React.FormEvent) => {
    e.preventDefault();
    startShift(openingCashInput);
    // Ensure staff member is also clocked in
    if (!isCurrentUserClockedIn) {
      handlePerformClockIn(currentUser, 'Shift Started with Cash Float');
    }
  };

  const handleConfirmCloseShift = () => {
    if (!currentShift) return;
    const variance = actualCashInput - currentShift.expectedCash;

    if (Math.abs(variance) > 50 && !varianceExplanation.trim()) {
      setErrorMessage('Cash variance detected! An explanation note is strictly required to close shift.');
      return;
    }

    try {
      closeShift(actualCashInput, varianceExplanation);
      setShowCloseModal(false);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Staff on-duty roster stats
  const staffOnDuty = useMemo(() => {
    return users.map((u) => {
      const status = getStaffClockStatus(u.id);
      return {
        user: u,
        isClockedIn: status.isClockedIn,
        latestLog: status.latestLog,
      };
    });
  }, [users, activityLogs]);

  const onDutyCount = staffOnDuty.filter((s) => s.isClockedIn).length;

  // Filtered activity logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (logTypeFilter !== 'ALL' && log.type !== logTypeFilter) return false;
      if (searchLogQuery) {
        const q = searchLogQuery.toLowerCase();
        const matchesName = log.userName.toLowerCase().includes(q);
        const matchesNote = (log.notes || '').toLowerCase().includes(q);
        const matchesRole = log.role.toLowerCase().includes(q);
        if (!matchesName && !matchesNote && !matchesRole) return false;
      }
      return true;
    });
  }, [activityLogs, logTypeFilter, searchLogQuery]);

  // Copy text representation of activity logs
  const handleCopyLogs = () => {
    const textLines = filteredLogs.map((log) => {
      const timeStr = new Date(log.timestamp).toLocaleString();
      const dur = log.durationMinutes ? ` (Duration: ${Math.floor(log.durationMinutes / 60)}h ${log.durationMinutes % 60}m)` : '';
      return `[${timeStr}] ${log.type} - ${log.userName} (${log.role.toUpperCase()})${dur} - Note: ${log.notes || 'None'}`;
    });
    navigator.clipboard.writeText(textLines.join('\n'));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2500);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Top Banner with Integrated Clock-In / Clock-Out Button */}
      <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">
                Staff & Shifts
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {onDutyCount} Staff on Floor
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
              Shift & Attendance Management
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              Clock-in/out timestamps, live duty hours, cash float reconciliation, and waiter accountability.
            </p>
          </div>
        </div>

        {/* Top Actions: Clock In/Out & Drawer Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Main User Clock-In / Clock-Out Button */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10">
            {isCurrentUserClockedIn ? (
              <div className="flex items-center gap-2 pl-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">On Duty:</span>
                  <span className="font-bold">
                    {currentUserClockStatus.latestLog
                      ? formatDuration(currentUserClockStatus.latestLog.timestamp)
                      : 'Active'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleToggleCurrentUserClock}
                  className="py-2 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
                  title="Clock out of your shift and log timestamp"
                >
                  <LogOut className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clock Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2">
                <span className="text-xs text-white/40 font-mono hidden sm:inline">
                  Status: Clocked Out
                </span>
                <button
                  type="button"
                  onClick={handleToggleCurrentUserClock}
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95"
                  title="Clock in and log staff activity with timestamp"
                >
                  <LogIn className="w-3.5 h-3.5 text-white" />
                  <span>Clock In ({currentUser.name.split(' ')[0]})</span>
                </button>
              </div>
            )}
          </div>

          {/* Shift status badge */}
          {currentShift ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Drawer Active ({new Date(currentShift.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
              <button
                onClick={() => {
                  setActualCashInput(currentShift.expectedCash);
                  setShowCloseModal(true);
                }}
                className="py-2 px-3.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          ) : (
            <span className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/5 text-white/40 text-xs font-mono font-semibold">
              No Drawer Open
            </span>
          )}
        </div>
      </div>

      {/* Action Feedback Banner */}
      {feedbackMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-2xl text-xs font-mono flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-white/40 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('drawer')}
            className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'drawer'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Cash Drawer & Float</span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Staff Clock & Activity Log</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white">
              {activityLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Staff Sales Leaderboard</span>
          </button>
        </div>

        {/* On-Duty Quick Count */}
        <div className="text-xs font-mono text-white/40 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Active Staff:</span>
          <span className="font-bold text-emerald-400">{onDutyCount} / {users.length} Clocked In</span>
        </div>
      </div>

      {/* TAB 1: Cash Drawer Reconciliation */}
      {activeTab === 'drawer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Active Shift Controls & Stats (6 cols) */}
          <div className="lg:col-span-6 space-y-5">
            {!currentShift ? (
              /* Open Shift Form */
              <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-8 space-y-5 shadow-xl text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                  <Play className="w-7 h-7 ml-0.5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-indigo-400">Shift Startup</span>
                  <h2 className="text-lg font-black text-white uppercase mt-0.5">Start Your Bar Shift</h2>
                  <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
                    Count your physical cash float drawer and input the starting balance before ringing up orders.
                  </p>
                </div>

                <form onSubmit={handleStartShift} className="space-y-4 max-w-xs mx-auto text-left">
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1.5 font-mono">
                      Opening Cash Drawer Float ({settings.currency})
                    </label>
                    <input
                      type="number"
                      required
                      value={openingCashInput}
                      onChange={(e) => setOpeningCashInput(Number(e.target.value))}
                      className="w-full bg-[#10121a] border border-[#2c3245] rounded-xl p-3 text-lg font-black text-amber-300 text-center focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow cursor-pointer transition-all active:scale-95"
                  >
                    Start Shift & Unlock POS
                  </button>
                </form>
              </div>
            ) : (
              /* Active Shift Live Board */
              <div className="bg-[#151822] border border-[#272d3e] rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#232838] pb-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                      Active Shift: {currentShift.waiterName}
                    </h2>
                    <span className="text-[11px] text-zinc-400">
                      Started at {new Date(currentShift.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-300">{currentShift.totalTransactions} Sales Completed</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#181c28] border border-[#272e42] p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-zinc-400">Starting Cash Float</span>
                    <div className="text-lg font-bold text-zinc-200 mt-0.5">
                      {settings.currency} {currentShift.openingCash.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-[#181c28] border border-[#272e42] p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Expected Cash In Drawer</span>
                    <div className="text-lg font-black text-emerald-400 mt-0.5">
                      {settings.currency} {currentShift.expectedCash.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-[#181c28] border border-[#272e42] p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-green-400">M-Pesa Collections</span>
                    <div className="text-lg font-black text-green-400 mt-0.5">
                      {settings.currency} {currentShift.mpesaTotal.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-[#181c28] border border-[#272e42] p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-blue-400">Card Collections</span>
                    <div className="text-lg font-black text-blue-400 mt-0.5">
                      {settings.currency} {currentShift.cardTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-[#11131c] p-3 rounded-xl border border-[#232838] flex items-center justify-between">
                  <span className="text-xs uppercase font-bold text-zinc-400">Shift Total Gross Sales:</span>
                  <span className="text-xl font-black text-amber-300">
                    {settings.currency} {currentShift.totalSales.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActualCashInput(currentShift.expectedCash);
                    setShowCloseModal(true);
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-900 to-rose-950 hover:from-rose-800 hover:to-rose-900 border border-rose-700/60 text-rose-100 font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  End Shift & Count Physical Cash
                </button>
              </div>
            )}

            {/* Waiter personal sales stats card */}
            <div className="bg-[#151822] border border-[#272d3e] rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">My Sales Summary Today</h3>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-[#181c27] p-2.5 rounded-xl border border-[#262c3e]">
                  <div className="text-[10px] uppercase text-zinc-400 font-bold">Total Rings</div>
                  <div className="text-sm font-black text-amber-300 mt-0.5">
                    {settings.currency} {myTotalSales.toLocaleString()}
                  </div>
                </div>
                <div className="bg-[#181c27] p-2.5 rounded-xl border border-[#262c3e]">
                  <div className="text-[10px] uppercase text-zinc-400 font-bold">Drinks Poured</div>
                  <div className="text-sm font-black text-zinc-200 mt-0.5">{myItemsSold}</div>
                </div>
                <div className="bg-[#181c27] p-2.5 rounded-xl border border-[#262c3e]">
                  <div className="text-[10px] uppercase text-zinc-400 font-bold">Avg Order</div>
                  <div className="text-sm font-black text-zinc-200 mt-0.5">
                    {settings.currency} {myAvgSale.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Staff Sales Leaderboard & Shift History (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            {/* Quick Attendance Widget in Drawer View */}
            <div className="bg-[#151822] border border-[#272d3e] rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-[#232838] pb-2.5">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                    Floor Staff Attendance Status
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center gap-1 cursor-pointer"
                >
                  <span>View Full Log</span>
                  <span>→</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {staffOnDuty.slice(0, 4).map(({ user: staffMember, isClockedIn, latestLog }) => (
                  <div
                    key={staffMember.id}
                    className="p-2.5 rounded-xl bg-[#181c28] border border-[#272e40] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg ${staffMember.avatarColor} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                        {staffMember.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-200 truncate max-w-[100px]">
                          {staffMember.name}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {isClockedIn ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {latestLog ? new Date(latestLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Duty'}
                            </span>
                          ) : (
                            <span className="text-zinc-500">Off Duty</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setClockModalUser(staffMember);
                        setClockModalAction(isClockedIn ? 'CLOCK_OUT' : 'CLOCK_IN');
                        setClockModalNote(isClockedIn ? 'Shift Completed' : 'Main Floor Service');
                        setShowClockModal(true);
                      }}
                      className={`py-1 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        isClockedIn
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isClockedIn ? 'Clock Out' : 'Clock In'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Shift History & Reconciliation */}
            <div className="bg-[#151822] border border-[#272d3e] rounded-2xl p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Shift Drawer History</h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {shifts.map((s) => (
                  <div
                    key={s.id}
                    className="bg-[#181c28] border border-[#272e40] p-2.5 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-zinc-200">{s.waiterName}</span>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {new Date(s.startedAt).toLocaleDateString()}{' '}
                        {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {s.endedAt
                          ? ` → ${new Date(s.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : ' (ACTIVE)'}
                      </div>
                      {s.varianceReason && (
                        <div className="text-[10px] text-amber-400">Note: {s.varianceReason}</div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-zinc-100">
                        {settings.currency} {s.totalSales.toLocaleString()}
                      </div>
                      {s.cashVariance !== undefined && (
                        <div
                          className={`text-[10px] font-bold ${
                            s.cashVariance === 0
                              ? 'text-emerald-400'
                              : s.cashVariance < 0
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          Variance: {settings.currency} {s.cashVariance.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Staff Clock & Activity Log (Full Section) */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Staff Floor Roster Cards */}
          <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Pub Staff Floor Attendance Roster
                  </h2>
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  Click any staff member's button to log Clock-In or Clock-Out with an instant timestamp.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleCurrentUserClock}
                  className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow ${
                    isCurrentUserClockedIn
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  {isCurrentUserClockedIn ? (
                    <>
                      <LogOut className="w-3.5 h-3.5 text-amber-400" />
                      <span>Clock Out {currentUser.name}</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Clock In {currentUser.name}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {staffOnDuty.map(({ user: staffMember, isClockedIn, latestLog }) => {
                const isMe = staffMember.id === currentUser.id;
                return (
                  <div
                    key={staffMember.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isClockedIn
                        ? 'bg-[#151926] border-emerald-500/30 shadow-lg shadow-emerald-950/20'
                        : 'bg-[#14161f] border-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${staffMember.avatarColor} text-white font-black text-sm flex items-center justify-center shadow`}>
                          {staffMember.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{staffMember.name}</span>
                            {isMe && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 font-mono uppercase">
                            {staffMember.roleTitle || staffMember.role} • {staffMember.employeeId}
                          </div>
                        </div>
                      </div>

                      {/* Status indicator badge */}
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isClockedIn
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-white/5 text-white/40 border-white/5'
                        }`}
                      >
                        {isClockedIn ? 'ON DUTY' : 'OFF DUTY'}
                      </span>
                    </div>

                    {/* Clocked in stats / details */}
                    <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-xs font-mono space-y-1 mb-3">
                      {isClockedIn && latestLog ? (
                        <>
                          <div className="flex justify-between text-white/60 text-[11px]">
                            <span>Clocked In:</span>
                            <span className="text-white font-bold">
                              {new Date(latestLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex justify-between text-white/60 text-[11px]">
                            <span>Current Duration:</span>
                            <span className="text-emerald-400 font-bold">{formatDuration(latestLog.timestamp)}</span>
                          </div>
                          {latestLog.notes && (
                            <div className="text-[10px] text-white/40 truncate">
                              Note: {latestLog.notes}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-white/30 text-[11px] text-center py-1">
                          Not currently clocked on shift.
                        </div>
                      )}
                    </div>

                    {/* Clock in / out action button */}
                    <button
                      type="button"
                      onClick={() => {
                        setClockModalUser(staffMember);
                        setClockModalAction(isClockedIn ? 'CLOCK_OUT' : 'CLOCK_IN');
                        setClockModalNote(isClockedIn ? 'Shift Completed' : 'Main Floor Service');
                        setShowClockModal(true);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow active:scale-98 ${
                        isClockedIn
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      }`}
                    >
                      {isClockedIn ? (
                        <>
                          <LogOut className="w-3.5 h-3.5 text-amber-400" />
                          <span>Clock Out</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-3.5 h-3.5" />
                          <span>Clock In Staff</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chronological Staff Activity & Timestamp Log */}
          <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Staff Activity & Timestamp Audit Log
                  </h3>
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  Full chronological log of clock-ins and clock-outs recorded with exact date, time, and shift duration.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search staff, duty notes..."
                    value={searchLogQuery}
                    onChange={(e) => setSearchLogQuery(e.target.value)}
                    className="bg-[#171922] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 bg-[#171922] p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setLogTypeFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      logTypeFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setLogTypeFilter('CLOCK_IN')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      logTypeFilter === 'CLOCK_IN' ? 'bg-emerald-600 text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Clock In
                  </button>
                  <button
                    onClick={() => setLogTypeFilter('CLOCK_OUT')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      logTypeFilter === 'CLOCK_OUT' ? 'bg-amber-600 text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Clock Out
                  </button>
                </div>

                {/* Copy Text Summary */}
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Copy log text to clipboard"
                >
                  {copiedLog ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Log</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Log Entries Table / List */}
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/30 font-mono">
                  No staff activity records match the current filter.
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isClockIn = log.type === 'CLOCK_IN';
                  const dateObj = new Date(log.timestamp);
                  const dateFormatted = dateObj.toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const timeFormatted = dateObj.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-[#161822] border border-white/5 hover:border-white/10 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      {/* Left: Event Type & Staff Name */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isClockIn
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {isClockIn ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{log.userName}</span>
                            <span
                              className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isClockIn
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {isClockIn ? 'CLOCK IN' : 'CLOCK OUT'}
                            </span>
                            <span className="text-[10px] text-white/40 uppercase font-mono">
                              ({log.role})
                            </span>
                          </div>

                          <div className="text-[11px] text-white/50 mt-0.5 flex flex-wrap items-center gap-2">
                            <span>Duty/Note: <strong className="text-white/70">{log.notes || 'Standard shift'}</strong></span>
                            {log.durationMinutes !== undefined && (
                              <span className="text-amber-300 font-mono font-semibold">
                                • Shift Duration: {Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Exact Timestamp */}
                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-white flex items-center justify-end gap-1.5">
                          <Clock className="w-3 h-3 text-indigo-400" />
                          <span>{timeFormatted}</span>
                        </div>
                        <div className="text-[10px] text-white/40 flex items-center justify-end gap-1 mt-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{dateFormatted}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Staff Sales Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Staff Sales Performance Leaderboard
                </h3>
                <p className="text-xs text-white/40">Real-time beverage volume and sales totals today.</p>
              </div>
            </div>
            <span className="text-[11px] text-white/40 font-mono">All shifts today</span>
          </div>

          <div className="space-y-2">
            {staffLeaderboard.map((staff, idx) => (
              <div
                key={staff.id}
                className="bg-[#181c28] border border-[#272e40] p-3.5 rounded-2xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl ${staff.avatarColor} text-white font-black text-xs flex items-center justify-center`}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-zinc-100 text-sm">{staff.name}</div>
                    <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      {staff.transactionCount} transactions • Avg order: {settings.currency}{' '}
                      {staff.avgOrder.toLocaleString()}
                      {staff.voidsCount > 0 && ` • Voids: ${staff.voidsCount}`}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-amber-300 font-mono">
                    {settings.currency} {staff.totalSales.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-white/40 font-mono">Gross Total</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Custom Clock In / Clock Out with Timestamp & Note */}
      {showClockModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#151822] border border-[#2c3245] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232838] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    clockModalAction === 'CLOCK_IN'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {clockModalAction === 'CLOCK_IN' ? (
                    <LogIn className="w-5 h-5" />
                  ) : (
                    <LogOut className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                    {clockModalAction === 'CLOCK_IN' ? 'Confirm Staff Clock-In' : 'Confirm Staff Clock-Out'}
                  </h3>
                  <p className="text-[11px] text-white/40">
                    Timestamped staff attendance entry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClockModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Staff Info Card */}
            <div className="bg-[#11131c] p-3.5 rounded-2xl border border-[#232838] flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${clockModalUser.avatarColor} text-white font-black text-sm flex items-center justify-center`}>
                {clockModalUser.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-bold text-white text-sm">{clockModalUser.name}</div>
                <div className="text-[11px] text-white/40 font-mono">
                  {clockModalUser.roleTitle || clockModalUser.role.toUpperCase()} • ID: {clockModalUser.employeeId}
                </div>
              </div>
            </div>

            {/* Timestamp Display */}
            <div className="bg-[#181c28] p-3 rounded-xl border border-[#272e42] space-y-1 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Current Timestamp:</span>
                <span className="font-bold text-amber-300">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Date:</span>
                <span className="text-zinc-200">
                  {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {clockModalAction === 'CLOCK_OUT' && (() => {
                const status = getStaffClockStatus(clockModalUser.id);
                if (status.latestLog) {
                  const durMins = Math.max(1, Math.round((Date.now() - new Date(status.latestLog.timestamp).getTime()) / 60000));
                  return (
                    <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-white/5">
                      <span>Total Shift Duration:</span>
                      <span>{Math.floor(durMins / 60)}h {durMins % 60}m</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Shift Duty Station / Notes */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 font-mono">
                Duty Station / Activity Note:
              </label>
              <input
                type="text"
                value={clockModalNote}
                onChange={(e) => setClockModalNote(e.target.value)}
                placeholder="e.g. Main Bar Floor, Bar Prep, Patio Service..."
                className="w-full bg-[#10121a] border border-[#2b3144] rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Main Bar Floor Duty',
                  'Bar Prep & Stocking',
                  'Patio & Outdoor Lounge',
                  'Supervisor & Cashier',
                  'Closing & Clean Up',
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setClockModalNote(tag)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClockModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1c202d] text-zinc-300 text-xs font-bold border border-[#2c3244] hover:bg-[#23293a] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (clockModalAction === 'CLOCK_IN') {
                    handlePerformClockIn(clockModalUser, clockModalNote);
                  } else {
                    handlePerformClockOut(clockModalUser, clockModalNote);
                  }
                  setShowClockModal(false);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  clockModalAction === 'CLOCK_IN'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950'
                }`}
              >
                {clockModalAction === 'CLOCK_IN' ? (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Confirm Clock In</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Confirm Clock Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && currentShift && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#161924] border border-[#2c3245] rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#232838] pb-3">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Shift Closing Reconciliation</span>
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="text-zinc-400 hover:text-zinc-200 text-xs">
                ✕
              </button>
            </div>

            {/* Reconciliation Comparison */}
            <div className="space-y-2 bg-[#10121a] p-3 rounded-xl border border-[#24293a] text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Expected Cash (Drawer Float + Cash Sales):</span>
                <span className="font-bold text-zinc-100">
                  {settings.currency} {currentShift.expectedCash.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>M-Pesa Recorded:</span>
                <span className="font-bold text-green-400">
                  {settings.currency} {currentShift.mpesaTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Card Recorded:</span>
                <span className="font-bold text-blue-400">
                  {settings.currency} {currentShift.cardTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Enter Actual Physical Cash Counted ({settings.currency}) *
              </label>
              <input
                type="number"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(Number(e.target.value))}
                className="w-full bg-[#10121a] border border-[#2b3144] rounded-xl p-2.5 text-base font-bold text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Calculated Variance */}
            {(() => {
              const variance = actualCashInput - currentShift.expectedCash;
              return (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center justify-between font-bold border ${
                    variance === 0
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                      : variance < 0
                      ? 'bg-rose-950/40 text-rose-400 border-rose-800/40'
                      : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                  }`}
                >
                  <span>Cash Drawer Variance:</span>
                  <span>
                    {variance > 0 ? `+${variance}` : variance} {settings.currency} (
                    {variance === 0 ? 'Balanced' : variance < 0 ? 'Shortage' : 'Surplus'})
                  </span>
                </div>
              );
            })()}

            {/* Required Variance Explanation */}
            {actualCashInput !== currentShift.expectedCash && (
              <div>
                <label className="block text-xs font-semibold text-amber-400 mb-1">
                  Variance Explanation Required *
                </label>
                <textarea
                  rows={2}
                  required
                  value={varianceExplanation}
                  onChange={(e) => setVarianceExplanation(e.target.value)}
                  placeholder="Explain why drawer does not match expected total..."
                  className="w-full bg-[#10121a] border border-[#2b3144] rounded-lg p-2 text-xs text-zinc-100"
                />
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2 rounded-xl bg-[#1c202d] text-zinc-300 text-xs font-bold border border-[#2c3244]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseShift}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider shadow"
              >
                Confirm & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
