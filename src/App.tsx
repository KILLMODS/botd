import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, AccountItem, TaskItem } from './types';
import { botApi } from './services/api';
import { initTelegramApp, getTelegramUser, triggerHaptic } from './services/telegram';
import { Header } from './components/Header';
import { Navbar, TabType } from './components/Navbar';
import { ProfileView } from './components/ProfileView';
import { AccountsView } from './components/AccountsView';
import { TasksView } from './components/TasksView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { AddAccountModal } from './components/AddAccountModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { ConnectionHelpModal } from './components/ConnectionHelpModal';
import { ReferralModal } from './components/ReferralModal';
import { TermsModal } from './components/TermsModal';
import { AdminStatsModal } from './components/AdminStatsModal';
import { AutoresponderModal } from './components/AutoresponderModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [isConnectionHelpOpen, setIsConnectionHelpOpen] = useState(false);

  // Pull to refresh
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPullingRef = useRef(false);

  // Modals
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [addAccountMode, setAddAccountMode] = useState<'select' | 'phone' | 'session'>('select');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isReferralOpen, setIsReferralOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isAdminStatsOpen, setIsAdminStatsOpen] = useState(false);
  const [isAutoresponderOpen, setIsAutoresponderOpen] = useState(false);

  // Initialize
  useEffect(() => {
    initTelegramApp();
  }, []);

  const loadData = useCallback(async (showIndicator = false) => {
    if (showIndicator) setIsSyncing(true);
    const tgUser = getTelegramUser();
    const uid = tgUser?.id || 1793274038;

    try {
      const [userData, accsData, tasksData] = await Promise.all([
        botApi.getUser(uid),
        botApi.getAccounts(uid),
        botApi.getTasks(uid),
      ]);

      setUser(userData);
      setAccounts(accsData);
      setTasks(tasksData);
      setIsServerConnected(botApi.isConnected);

      if (selectedTask) {
        const refreshed = tasksData.find(t => t.id === selectedTask.id);
        if (refreshed) setSelectedTask(refreshed);
      }
    } finally {
      if (showIndicator) setIsSyncing(false);
    }
  }, [selectedTask]);

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      loadData(false);
    }, 7000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Touch handlers for Pull-to-Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 5) {
      touchStartY.current = e.touches[0].clientY;
      isPullingRef.current = true;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || window.scrollY > 5) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      const distance = Math.min(80, Math.pow(diff, 0.85));
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (isPullingRef.current && pullDistance > 45) {
      triggerHaptic('medium');
      setPullDistance(45);
      await loadData(true);
    }
    setPullDistance(0);
    isPullingRef.current = false;
  };

  // Handlers for Accounts
  const handleDeleteAccount = async (accountId: number) => {
    if (!user) return;
    await botApi.deleteAccount(user.user_id, accountId);
    setAccounts(prev => prev.filter(a => a.id !== accountId));
  };

  const handleAccountAdded = (newAcc: AccountItem) => {
    setAccounts(prev => [...prev.filter(a => a.id !== newAcc.id), newAcc]);
  };

  // Handlers for Tasks
  const handleCreateTask = async (taskData: Partial<TaskItem>) => {
    const created = await botApi.createTask(taskData);
    setTasks(prev => [created, ...prev]);
  };

  const handleSaveTask = async (taskId: number, updates: Partial<TaskItem>) => {
    const updated = await botApi.updateTask(taskId, updates);
    if (updated) {
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      setSelectedTask(updated);
    }
  };

  const handleToggleTaskRun = async (taskId: number, currentStatus: string) => {
    const nextStatus = await botApi.toggleTaskRun(taskId, currentStatus);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus as TaskItem['status'] } : t));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => prev ? { ...prev, status: nextStatus as TaskItem['status'] } : null);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    await botApi.deleteTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
  };

  const handleAcceptTerms = async () => {
    if (!user) return;
    await botApi.acceptTerms(user.user_id);
    setUser(prev => prev ? { ...prev, terms_accepted: 1 } : null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-black text-white">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center space-y-3 max-w-xs w-full">
          <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto" />
          <div className="text-xs text-neutral-400 font-mono">Синхронизация...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen text-white flex flex-col relative selection:bg-white selection:text-black overflow-x-hidden"
    >
      {/* Animated Subtle Gray Stripes & Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        {/* Deep base backdrop */}
        <div className="absolute inset-0 bg-[#08090d]" />

        {/* Smooth drifting ambient colored glows */}
        <div className="absolute -top-36 -left-36 w-[450px] h-[450px] rounded-full bg-blue-600/[0.14] blur-[120px] animate-[ambient-pulse-1_14s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 -right-36 w-[400px] h-[400px] rounded-full bg-indigo-500/[0.11] blur-[130px] animate-[ambient-pulse-2_18s_ease-in-out_infinite]" />
        <div className="absolute -bottom-28 left-1/4 w-[380px] h-[380px] rounded-full bg-emerald-500/[0.08] blur-[110px] animate-[ambient-pulse-1_16s_ease-in-out_infinite_reverse]" />

        {/* Gray Diagonal Animated Stripes Overlay */}
        <div className="absolute inset-0 bg-gray-stripes opacity-80" />

        {/* Subtle Vertical Accent Pinstripes */}
        <div className="absolute inset-0 bg-vertical-grid-stripes opacity-45" />

        {/* Soft Radial Vignette for Content Readability */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,transparent_20%,rgba(0,0,0,0.7)_90%)]" />
      </div>

      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div
          style={{ height: `${pullDistance}px` }}
          className="relative z-30 overflow-hidden flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-100 border-b border-white/[0.06]"
        >
          <div className={`w-4 h-4 rounded-full border-2 border-neutral-400 border-t-transparent ${pullDistance >= 45 ? 'animate-spin' : ''}`} />
          <span className="text-[11px] font-mono text-neutral-400 ml-2">
            {pullDistance >= 45 ? 'Отпустите для обновления' : 'Потяните для обновления'}
          </span>
        </div>
      )}

      {/* Top Header */}
      <Header user={user} />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-md w-full mx-auto px-4 pt-3">
        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            accounts={accounts}
            tasks={tasks}
            onGoToTab={(tab) => setActiveTab(tab)}
            onOpenAddAccount={() => {
              setAddAccountMode('select');
              setIsAddAccountOpen(true);
            }}
            onOpenReferrals={() => setIsReferralOpen(true)}
            onOpenAutoresponder={() => setIsAutoresponderOpen(true)}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            accounts={accounts}
            user={user}
            onOpenAddModal={(mode = 'select') => {
              setAddAccountMode(mode);
              setIsAddAccountOpen(true);
            }}
            onDeleteAccount={handleDeleteAccount}
            onGoToSub={() => setActiveTab('subscription')}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            accounts={accounts}
            user={user}
            onOpenCreateModal={() => setIsCreateTaskOpen(true)}
            onSelectTask={(task) => setSelectedTask(task)}
            onToggleTaskRun={handleToggleTaskRun}
          />
        )}

        {activeTab === 'subscription' && (
          <SubscriptionsView
            user={user}
            onUpdateUser={(updated) => setUser(updated)}
          />
        )}
      </main>

      {/* Bottom Floating Navigation Dock */}
      <Navbar
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        accountsCount={accounts.length}
        tasksCount={tasks.length}
      />

      {/* Initial Mandatory Terms Acceptance Prompt */}
      {user.terms_accepted === 0 && (
        <TermsModal
          isInitialPrompt={true}
          onClose={() => {}}
          onAccept={handleAcceptTerms}
        />
      )}

      {/* Modals */}
      {isTermsOpen && (
        <TermsModal
          isInitialPrompt={false}
          onClose={() => setIsTermsOpen(false)}
        />
      )}

      {isReferralOpen && (
        <ReferralModal
          user={user}
          onClose={() => setIsReferralOpen(false)}
        />
      )}

      {isAdminStatsOpen && (
        <AdminStatsModal
          onClose={() => setIsAdminStatsOpen(false)}
        />
      )}

      {isConnectionHelpOpen && (
        <ConnectionHelpModal
          onClose={() => setIsConnectionHelpOpen(false)}
          onRefreshData={async () => {
            await loadData(true);
          }}
        />
      )}

      {isAddAccountOpen && (
        <AddAccountModal
          userId={user.user_id}
          initialMode={addAccountMode}
          onClose={() => setIsAddAccountOpen(false)}
          onSuccess={handleAccountAdded}
        />
      )}

      {isAutoresponderOpen && (
        <AutoresponderModal
          user={user}
          onClose={() => setIsAutoresponderOpen(false)}
          onUpdateUser={(updated) => setUser(updated)}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          accounts={accounts}
          user={user}
          onClose={() => setSelectedTask(null)}
          onSave={handleSaveTask}
          onToggleRun={handleToggleTaskRun}
          onDelete={handleDeleteTask}
          onOpenSubscriptions={() => setActiveTab('subscription')}
        />
      )}

      {isCreateTaskOpen && (
        <CreateTaskModal
          user={user}
          accounts={accounts}
          onClose={() => setIsCreateTaskOpen(false)}
          onCreate={handleCreateTask}
          onOpenSubscriptions={() => setActiveTab('subscription')}
        />
      )}
    </div>
  );
}
