import React, { useState } from 'react';
import { UserProfile, AccountItem, TaskItem } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { 
  User as UserIcon, 
  Users, 
  ChevronRight, 
  Layers, 
  Smartphone,
  Info,
  ShoppingBag,
  Zap,
  X
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface ProfileViewProps {
  user: UserProfile;
  accounts: AccountItem[];
  tasks: TaskItem[];
  onGoToTab: (tab: 'subscription' | 'accounts' | 'tasks') => void;
  onOpenReferrals: () => void;
  onOpenShop: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  accounts,
  tasks,
  onGoToTab,
  onOpenReferrals,
  onOpenShop,
}) => {
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;
  const isPro = user.sub_plan === 'pro' || user.sub_plan === 'premium';
  const tokens = user.tokens_balance ?? 500;
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
    <div className="space-y-4 pb-28 animate-fade-in select-none">
      {/* 16:9 iOS Liquid Glass Card */}
      <div className="w-full aspect-[16/9] min-h-[210px] relative rounded-[28px] overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.2)] flex flex-col justify-between p-5">
        {/* Softly Blurred Darkened Avatar Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden bg-[#12131a]">
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt=""
              className="w-full h-full object-cover scale-125 filter blur-2xl opacity-35"
            />
          ) : (
            <div className="w-full h-full bg-neutral-900 filter blur-xl" />
          )}
          {/* Liquid Dark Glass Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_70%)]" />
        </div>

        {/* Top Header Row on Card */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-['Caveat',cursive] text-2xl sm:text-3xl text-amber-300 font-bold tracking-wide">
                Здорово,
              </span>
              <span className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-[220px] sm:max-w-[260px]">
                {user.username ? `@${user.username}` : user.first_name || 'Пользователь'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono text-neutral-400">ID: {user.user_id}</span>
              <span className="text-neutral-600">•</span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isPro 
                  ? 'bg-white/15 text-white border-white/20'
                  : 'bg-white/10 text-neutral-300 border-white/10'
              }`}>
                {plan.name}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: BLX Balance + Shop Button */}
        <div className="flex items-end justify-between relative z-10 pt-2">
          {/* Clean BLX Tokens Display with Info Button */}
          <div className="flex items-center gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                Баланс токенов
              </div>
              <div className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight leading-snug">
                {tokens.toLocaleString('ru-RU')}{' '}
                <span className="text-xs font-semibold text-neutral-300">BLX</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowTokenInfo(true);
              }}
              title="Информация о токенах BLX"
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini Round Icon Shop Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onOpenShop();
            }}
            title="Магазин токенов"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 shadow-md text-white flex items-center justify-center active:scale-90 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Token Info Popup Modal */}
      {showTokenInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xs bg-[#1c1c1e] border border-white/15 rounded-3xl p-5 shadow-2xl relative text-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪙</span>
                <h4 className="text-sm font-bold text-white">Токены BLX</h4>
              </div>
              <button
                onClick={() => setShowTokenInfo(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Токены <strong>BLX</strong> расходуются на отправку сообщений в ваших рассылках:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="font-semibold text-white">В подписке Start:</div>
                <div className="text-neutral-400 mt-0.5">
                  • <strong>1 токен = 1 сообщение</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/10 border border-white/20">
                <div className="font-semibold text-amber-300">В подписке Pro:</div>
                <div className="text-neutral-200 mt-0.5">
                  • <strong>1 токен = 2 сообщения</strong> (в 2 раза выгоднее).
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowTokenInfo(false);
                onOpenShop();
              }}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Пополнить баланс в магазине</span>
            </button>
          </div>
        </div>
      )}

      {/* Referrals Card */}
      <button
        onClick={() => {
          triggerHaptic('medium');
          onOpenReferrals();
        }}
        className="w-full p-4 rounded-3xl bg-[#1c1c1e]/90 hover:bg-[#2c2c2e] border border-white/12 flex items-center justify-between text-white transition-all shadow-md active:scale-[0.99]"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-white tracking-tight">Реферальная программа</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/12 text-neutral-200 border border-white/15">
                +{plan.ref_bonus} токенов
              </span>
            </div>
            <p className="text-[12px] text-neutral-400 mt-0.5">
              Приглашайте друзей и получайте бонусные токены
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-neutral-300 flex-shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>

      {/* Plan Details & Limits Card */}
      <div className="bg-[#1c1c1e]/90 border border-white/12 rounded-3xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Текущий тариф</div>
            <div className="text-[16px] font-bold text-white tracking-tight">{plan.name}</div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('medium');
              onGoToTab('subscription');
            }}
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-[12px] font-semibold transition-all flex items-center gap-1 active:scale-95 border border-white/10"
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
          <div className="w-full h-2 rounded-full bg-black/50 border border-white/10 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${limitPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span>Срок: {expiresText}</span>
            {bonus > 0 && <span className="text-neutral-300">+{bonus} бонусных</span>}
          </div>
        </div>

        {/* Note on Free Watermark */}
        {user.sub_plan === 'free' && (
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
            <span>В тарифе Start добавляется вотермарка бота</span>
            <button
              onClick={() => onGoToTab('subscription')}
              className="text-white hover:underline font-semibold"
            >
              Снять в Pro →
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards: Accounts & Tasks */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('accounts');
          }}
          className="bg-[#1c1c1e]/90 border border-white/12 rounded-3xl p-4 cursor-pointer hover:bg-[#2c2c2e] transition-all active:scale-95 shadow-md"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            <span>Аккаунты</span>
            <Smartphone className="w-4 h-4 text-neutral-400" />
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
          className="bg-[#1c1c1e]/90 border border-white/12 rounded-3xl p-4 cursor-pointer hover:bg-[#2c2c2e] transition-all active:scale-95 shadow-md"
        >
          <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            <span>Задачи</span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono tracking-tight">
            {tasks.length}
          </div>
        </div>
      </div>
    </div>
  );
};

