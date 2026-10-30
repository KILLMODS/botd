import React from 'react';
import { UserProfile, AccountItem, TaskItem } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { Smartphone, ListTodo, Zap, Clock, ChevronRight, User as UserIcon } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface ProfileViewProps {
  user: UserProfile;
  accounts: AccountItem[];
  tasks: TaskItem[];
  onGoToTab: (tab: 'subscription' | 'accounts' | 'tasks') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  accounts,
  tasks,
  onGoToTab,
}) => {
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;

  let expiresText = '♾️ Бессрочно (Free)';
  if (user.sub_expires_at > 0) {
    const remSec = user.sub_expires_at - Math.floor(Date.now() / 1000);
    if (remSec > 0) {
      const days = Math.floor(remSec / 86400);
      const hours = Math.floor((remSec % 86400) / 3600);
      expiresText = `${days}д ${hours}ч`;
    } else {
      expiresText = 'Истекла';
    }
  }

  const sentCount = user.sub_plan === 'free' ? user.free_limit_used : user.daily_sent;
  const limitPercent = Math.min(100, Math.round((sentCount / plan.daily_limit) * 100));

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-200">
      {/* Profile Card */}
      <div className="bg-neutral-900/70 border border-white/15 rounded-3xl p-5 relative overflow-hidden backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full border-2 border-white/20 overflow-hidden bg-black flex items-center justify-center flex-shrink-0">
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.first_name || 'User'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <UserIcon className="w-8 h-8 text-neutral-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">
              {user.first_name || 'Пользователь'}
            </h2>
            {user.username && (
              <p className="text-xs text-neutral-400 truncate">@{user.username}</p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white text-black">
                Тариф: {plan.name}
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">
                ID: {user.user_id}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Card */}
      <div className="bg-neutral-900/70 border border-white/15 rounded-3xl p-5 space-y-4 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400 font-semibold">
              Подписка
            </div>
            <div className="text-base font-bold text-white">{plan.name}</div>
            <div className="text-xs text-neutral-400">Срок: {expiresText}</div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('medium');
              onGoToTab('subscription');
            }}
            className="px-3.5 py-2 rounded-2xl bg-white text-black text-xs font-bold hover:bg-neutral-200 flex items-center gap-1 active:scale-95 transition-all"
          >
            Сменить тариф
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Limit Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">Отправлено сообщений:</span>
            <span className="font-mono font-bold text-white">
              {sentCount} <span className="text-neutral-500">/ {plan.daily_limit}</span>
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${limitPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2x2 Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('accounts');
          }}
          className="bg-neutral-900/70 border border-white/15 rounded-3xl p-4 cursor-pointer hover:border-white/30 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <Smartphone className="w-5 h-5 text-white" />
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {accounts.length} <span className="text-xs text-neutral-400">/ {plan.max_accounts}</span>
          </div>
          <div className="text-xs text-neutral-400 mt-1">Аккаунты</div>
        </div>

        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('tasks');
          }}
          className="bg-neutral-900/70 border border-white/15 rounded-3xl p-4 cursor-pointer hover:border-white/30 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <ListTodo className="w-5 h-5 text-white" />
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {tasks.length}
          </div>
          <div className="text-xs text-neutral-400 mt-1">Задачи рассылки</div>
        </div>

        <div className="bg-neutral-900/70 border border-white/15 rounded-3xl p-4">
          <Zap className="w-5 h-5 text-white mb-2" />
          <div className="text-2xl font-bold text-white font-mono">
            {plan.min_delay} <span className="text-xs text-neutral-400">сек</span>
          </div>
          <div className="text-xs text-neutral-400 mt-1">Мин. интервал</div>
        </div>

        <div className="bg-neutral-900/70 border border-white/15 rounded-3xl p-4">
          <Clock className="w-5 h-5 text-white mb-2" />
          <div className="text-sm font-bold text-white mt-1">
            Готов
          </div>
          <div className="text-xs text-neutral-400 mt-1">Служба рассылок</div>
        </div>
      </div>

      {/* Commands card */}
      <div className="bg-neutral-900/50 border border-white/10 rounded-3xl p-4 space-y-2">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Команды в Telegram боте:
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
          <div className="p-2.5 rounded-2xl bg-neutral-950 border border-white/5">
            <code className="text-white font-mono">/start</code> — Меню
          </div>
          <div className="p-2.5 rounded-2xl bg-neutral-950 border border-white/5">
            <code className="text-white font-mono">/accs</code> — Аккаунты
          </div>
          <div className="p-2.5 rounded-2xl bg-neutral-950 border border-white/5">
            <code className="text-white font-mono">/tasks</code> — Задачи
          </div>
          <div className="p-2.5 rounded-2xl bg-neutral-950 border border-white/5">
            <code className="text-white font-mono">/sub</code> — Подписка
          </div>
        </div>
      </div>
    </div>
  );
};
