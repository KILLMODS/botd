import React from 'react';
import { UserProfile, AccountItem, TaskItem } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { User as UserIcon } from 'lucide-react';
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

  let expiresText = 'Бессрочно';
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
    <div className="space-y-3 pb-28">
      {/* Profile Card */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full border border-neutral-800 overflow-hidden bg-neutral-950 flex items-center justify-center flex-shrink-0">
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
            <UserIcon className="w-6 h-6 text-neutral-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white truncate">
              {user.first_name || 'Пользователь'}
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300">
              {plan.name}
            </span>
          </div>
          <div className="text-xs text-neutral-400 font-mono flex items-center gap-2 mt-0.5">
            <span>ID: {user.user_id}</span>
            {user.username && <span>@{user.username}</span>}
          </div>
        </div>
      </div>

      {/* Plan Details & Limits Card */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-neutral-400">Текущий тариф</div>
            <div className="text-sm font-semibold text-white">{plan.name}</div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('medium');
              onGoToTab('subscription');
            }}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-medium transition-colors"
          >
            Сменить тариф
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs">
            <span className="text-neutral-400">Отправлено сегодня:</span>
            <span className="font-mono text-white">
              {sentCount} <span className="text-neutral-500">/ {plan.daily_limit}</span>
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${limitPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-neutral-500 font-mono">
            Действует: {expiresText}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('accounts');
          }}
          className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3.5 cursor-pointer hover:border-neutral-700 transition-colors"
        >
          <div className="text-[11px] text-neutral-400 mb-1">Аккаунты</div>
          <div className="text-xl font-semibold text-white font-mono">
            {accounts.length} <span className="text-xs text-neutral-500 font-normal">/ {plan.max_accounts}</span>
          </div>
        </div>

        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('tasks');
          }}
          className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3.5 cursor-pointer hover:border-neutral-700 transition-colors"
        >
          <div className="text-[11px] text-neutral-400 mb-1">Задачи</div>
          <div className="text-xl font-semibold text-white font-mono">
            {tasks.length}
          </div>
        </div>
      </div>
    </div>
  );
};
