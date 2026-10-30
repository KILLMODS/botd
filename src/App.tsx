import { useState, useEffect, useCallback } from 'react';
import { UserProfile, AccountItem, TaskItem } from './types';
import { botApi } from './services/api';
import { initTelegramApp, getTelegramUser } from './services/telegram';
import { Header } from './components/Header';
import { Navbar, TabType } from './components/Navbar';
import { ProfileView } from './components/ProfileView';
import { AccountsView } from './components/AccountsView';
import { TasksView } from './components/TasksView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { AddAccountModal } from './components/AddAccountModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CreateTaskModal } from './components/CreateTaskModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

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
    const uid = tgUser?.id || 745950213;

    try {
      const [userData, accsData, tasksData] = await Promise.all([
        botApi.getUser(uid),
        botApi.getAccounts(uid),
        botApi.getTasks(uid),
      ]);

      setUser(userData);
      setAccounts(accsData);
      setTasks(tasksData);

      // Keep selectedTask updated if modal is open
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
  }, [loadData]);

  // Handlers for Accounts
  const handleDeleteAccount = async (accountId: number) => {
    if (!user) return;
    await botApi.deleteAccount(user.user_id, accountId);
    setAccounts(prev => prev.filter(a => a.id !== accountId));
  };

  const handleAccountAdded = (newAcc: AccountItem) => {
    setAccounts(prev => [...prev, newAcc]);
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#090a0f]">
        <div className="apple-glass-card rounded-3xl p-8 text-center space-y-3 max-w-xs w-full">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mx-auto animate-spin">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
          </div>
          <div className="text-sm font-bold text-white">Загрузка Mini App...</div>
          <div className="text-xs text-slate-400">Инициализация профиля Telegram</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col relative selection:bg-blue-500/30">
      {/* Decorative ambient Apple glows in background */}
      <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/15 blur-[130px] pointer-events-none -z-10" />

      {/* Top Header */}
      <Header
        user={user}
        isSyncing={isSyncing}
        onRefresh={() => loadData(true)}
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

      {/* Bottom Floating Navigation Dock */}
      <Navbar
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        accountsCount={accounts.length}
        tasksCount={tasks.length}
      />

      {/* Modals */}
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
