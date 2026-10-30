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
  const [addAccountMode, setAddAccountMode] = useState<'phone' | 'session'>('phone');
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

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
      className="min-h-screen bg-black text-white flex flex-col relative selection:bg-white selection:text-black overflow-x-hidden"
    >
      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div
          style={{ height: `${pullDistance}px` }}
          className="overflow-hidden flex items-center justify-center bg-black transition-all duration-100 border-b border-neutral-900"
        >
          <div className={`w-4 h-4 rounded-full border-2 border-neutral-400 border-t-transparent ${pullDistance >= 45 ? 'animate-spin' : ''}`} />
          <span className="text-[11px] font-mono text-neutral-500 ml-2">
            {pullDistance >= 45 ? 'Отпустите для обновления' : 'Потяните для обновления'}
          </span>
        </div>
      )}

      {/* Top Header */}
      <Header
        user={user}
        isConnected={isServerConnected}
        onOpenConnectionHelp={() => setIsConnectionHelpOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3">
        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            accounts={accounts}
            tasks={tasks}
            onGoToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsView
            accounts={accounts}
            user={user}
            onOpenAddModal={(mode) => {
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

      {/* Bottom Floating Navigation Dock with Sliding Indicator */}
      <Navbar
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        accountsCount={accounts.length}
        tasksCount={tasks.length}
      />

      {/* Modals */}
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

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          accounts={accounts}
          user={user}
          onClose={() => setSelectedTask(null)}
          onSave={handleSaveTask}
          onToggleRun={handleToggleTaskRun}
          onDelete={handleDeleteTask}
        />
      )}

      {isCreateTaskOpen && (
        <CreateTaskModal
          user={user}
          accounts={accounts}
          onClose={() => setIsCreateTaskOpen(false)}
          onCreate={handleCreateTask}
        />
      )}
    </div>
  );
}
