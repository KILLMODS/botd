import React from 'react';
import { UserProfile, AccountItem, TaskItem } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { 
  User as UserIcon, 
  Plus, 
  Users, 
  Gift, 
  ChevronRight, 
  Layers, 
  Smartphone
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface ProfileViewProps {
  user: UserProfile;
  accounts: AccountItem[];
  tasks: TaskItem[];
  onGoToTab: (tab: 'subscription' | 'accounts' | 'tasks') => void;
  onOpenAddAccount: () => void;
  onOpenReferrals: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  accounts,
  tasks,
  onGoToTab,
  onOpenAddAccount,
  onOpenReferrals,
}) => {
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;
  const bonus = user.bonus_messages || 0;
  const totalLimit = plan.daily_limit + bonus;

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
  const limitPercent = Math.min(100, Math.round((sentCount / totalLimit) * 100));

  return (
    <div className="space-y-3.5 pb-28">
      {/* Profile Card (Without border or frame around avatar) */}
      <div className="apple-group-card p-4 flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-[#181920] flex items-center justify-center flex-shrink-0">
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
            <UserIcon className="w-6 h-6 text-neutral-400" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-semibold text-white tracking-tight truncate">
              {user.first_name || 'Пользователь'}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
              user.sub_plan === 'premium' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
              user.sub_plan === 'pro' ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30' :
              'bg-white/10 text-neutral-300'
            }`}>
              {plan.name}
            </span>
          </div>
          <div className="text-[12px] text-neutral-400 font-mono flex items-center gap-2 mt-0.5">
            <span>ID: {user.user_id}</span>
            {user.username && <span>@{user.username}</span>}
          </div>
        </div>
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenAddAccount();
          }}
          className="py-3 px-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить аккаунт</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenReferrals();
          }}
          className="py-3 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
        >
          <Users className="w-4 h-4" />
          <span>Рефералы</span>
        </button>
      </div>

      {/* Bonus Messages Banner if active */}
      {bonus > 0 && (
        <div className="apple-group-card p-3.5 flex items-center justify-between border-blue-500/20 bg-blue-950/20">
          <div className="flex items-center gap-2.5">
            <Gift className="w-4 h-4 text-blue-400" />
            <div className="text-[13px]">
              <span className="text-white font-medium">Бонус: </span>
              <span className="text-blue-300 font-bold">+{bonus} сообщений</span>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onOpenReferrals();
            }}
            className="text-[12px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
          >
            Инфо <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Plan Details & Limits Card */}
      <div className="apple-group-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Текущий тариф</div>
            <div className="text-[15px] font-semibold text-white tracking-tight">{plan.name}</div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('medium');
              onGoToTab('subscription');
            }}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-[12px] font-semibold transition-all flex items-center gap-1 active:scale-95"
          >
            Тарифы
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[12px]">
            <span className="text-neutral-400">Отправлено сегодня:</span>
            <span className="font-mono text-white font-medium">
              {sentCount} <span className="text-neutral-500">/ {totalLimit}</span>
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/40 border border-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${limitPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span>Срок: {expiresText}</span>
            {bonus > 0 && <span className="text-blue-400">+{bonus} бонусных</span>}
          </div>
        </div>
      </div>

      {/* Stats Cards: Accounts & Tasks */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('accounts');
          }}
          className="apple-group-card p-3.5 cursor-pointer hover:bg-white/[0.06] transition-all active:scale-95"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            <span>Аккаунты</span>
            <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tracking-tight">
            {accounts.length} <span className="text-xs text-neutral-500 font-normal">/ {plan.max_accounts}</span>
          </div>
        </div>

        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('tasks');
          }}
          className="apple-group-card p-3.5 cursor-pointer hover:bg-white/[0.06] transition-all active:scale-95"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            <span>Задачи</span>
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tracking-tight">
            {tasks.length}
          </div>
        </div>
      </div>
    </div>
  );
};
