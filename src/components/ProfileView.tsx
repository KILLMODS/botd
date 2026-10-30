import React from 'react';
import { UserProfile, AccountItem, TaskItem } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { Sparkles, Smartphone, Send, Zap, Clock, ShieldCheck, ChevronRight, Server } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface ProfileViewProps {
  user: UserProfile;
  accounts: AccountItem[];
  tasks: TaskItem[];
  onGoToTab: (tab: 'subscription' | 'accounts' | 'tasks') => void;
  onOpenSettings: () => void;
  isBackendConnected: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  accounts,
  tasks,
  onGoToTab,
  onOpenSettings,
  isBackendConnected,
}) => {
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;

  // Format expiration
  let expiresText = '♾️ Навсегда (Free)';
  if (user.sub_expires_at > 0) {
    const remSec = user.sub_expires_at - Math.floor(Date.now() / 1000);
    if (remSec > 0) {
      const days = Math.floor(remSec / 86400);
      const hours = Math.floor((remSec % 86400) / 3600);
      expiresText = `⏳ ${days}д ${hours}ч`;
    } else {
      expiresText = '❌ Истекла';
    }
  }

  const sentCount = user.sub_plan === 'free' ? user.free_limit_used : user.daily_sent;
  const limitPercent = Math.min(100, Math.round((sentCount / plan.daily_limit) * 100));

  return (
    <div className="space-y-4 pb-28 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* User Hero Glass Card */}
      <div className="apple-glass-card rounded-3xl p-5 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[1.5px] shadow-xl shadow-blue-500/20 flex-shrink-0">
            <div className="w-full h-full bg-[#11131f] rounded-2xl flex items-center justify-center font-bold text-xl text-white">
              {user.first_name ? user.first_name.slice(0, 2).toUpperCase() : 'TG'}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white truncate">
                {user.first_name || 'Пользователь'}
              </h2>
              <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
            </div>
            {user.username && (
              <p className="text-xs text-slate-400 truncate">@{user.username}</p>
            )}
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 text-blue-300">
                {plan.name}
              </span>
              <span className="text-[11px] text-slate-400">
                ID: <span className="font-mono text-slate-300">{user.user_id}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bothost / Bot sync bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Server className={`w-3.5 h-3.5 ${isBackendConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="text-slate-300 text-[11px]">
              {isBackendConnected ? 'Синхронизировано с bothost.ru' : 'Локальный режим (готов к подключению)'}
            </span>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenSettings();
            }}
            className="text-blue-400 hover:text-blue-300 text-[11px] font-medium flex items-center gap-0.5"
          >
            Настроить
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Plan & Limits Progress Card */}
      <div className="apple-glass-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Текущий тариф</h3>
              <p className="text-[11px] text-slate-400">Срок: {expiresText}</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('medium');
              onGoToTab('subscription');
            }}
            className="apple-glass-button px-3 py-1.5 rounded-full text-xs font-semibold text-blue-300 border-blue-400/30 hover:text-white flex items-center gap-1 active:scale-95 transition-all"
          >
            Тарифы
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Limit Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Отправлено сегодня / лимит</span>
            <span className="font-semibold text-white">
              {sentCount} <span className="text-slate-500">/ {plan.daily_limit}</span>
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden p-[1px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${limitPercent}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 text-right">{limitPercent}% израсходовано</p>
        </div>
      </div>

      {/* Stats 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Connected Accounts */}
        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('accounts');
          }}
          className="apple-glass-card rounded-3xl p-4 cursor-pointer hover:border-white/20 active:scale-95 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {accounts.length} <span className="text-xs font-normal text-slate-400">/ {plan.max_accounts}</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Подключено аккаунтов</div>
        </div>

        {/* Tasks */}
        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('tasks');
          }}
          className="apple-glass-card rounded-3xl p-4 cursor-pointer hover:border-white/20 active:scale-95 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
              <Send className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {tasks.length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Всего задач рассылки</div>
        </div>

        {/* Min Delay */}
        <div className="apple-glass-card rounded-3xl p-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-2">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {plan.min_delay} <span className="text-xs font-normal text-slate-400">сек</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Мин. интервал тарифа</div>
        </div>

        {/* Status */}
        <div className="apple-glass-card rounded-3xl p-4">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            Активен
          </div>
          <div className="text-xs text-slate-400 mt-1">Готов к рассылкам</div>
        </div>
      </div>

      {/* Helpful Telegram Commands card */}
      <div className="apple-glass-card rounded-3xl p-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Команды в Telegram боте:
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <code className="text-blue-300 font-mono">/start</code> — Главное меню
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <code className="text-blue-300 font-mono">/accs</code> — Список аккаунтов
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <code className="text-blue-300 font-mono">/tasks</code> — Задачи рассылки
          </div>
          <div className="p-2 rounded-xl bg-white/5 border border-white/5">
            <code className="text-blue-300 font-mono">/sub</code> — Оплата подписки
          </div>
        </div>
      </div>
    </div>
  );
};
