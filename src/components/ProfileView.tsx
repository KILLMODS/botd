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
      {/* 16:9 Card with Brighter Visible Avatar (Retains 16:9 format as requested) */}
      <div className="w-full aspect-[16/9] min-h-[210px] relative rounded-[28px] overflow-hidden border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.25)] flex flex-col justify-between p-5">
        {/* Clearly Visible & Brightened Avatar Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden bg-[#10121a]">
          {user.photo_url ? (
            <img
              src={user.photo_url}
              alt=""
              className="w-full h-full object-cover scale-110 filter blur-[5px] opacity-75 brightness-120 saturate-125 transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-[#161a29] via-[#242b45] to-[#141724] filter blur-sm flex items-center justify-center opacity-80" />
          )}
          {/* Softer Gradients for Clear Avatar Visibility & Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.20),transparent_70%)]" />
        </div>

        {/* Top Header Row on Card */}
        <div className="flex items-start justify-between relative z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-['Caveat',cursive] text-3xl sm:text-4xl text-amber-300 font-bold tracking-wide drop-shadow-md">
                Здарова,
              </span>
              <span className="truncate max-w-[220px] sm:max-w-[260px] drop-shadow-md">
                <span className="font-['Marck_Script',cursive] text-2xl sm:text-3xl text-amber-200 font-bold tracking-wider">
                  {user.username ? `@${user.username}` : (user.first_name || 'Пользователь')}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono text-neutral-300 drop-shadow">ID: {user.user_id}</span>
              <span className="text-neutral-500">•</span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shadow-sm ${
                isPro 
                  ? 'bg-amber-400/25 text-amber-200 border-amber-300/40 backdrop-blur-md'
                  : 'bg-white/15 text-neutral-200 border-white/20 backdrop-blur-md'
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
              <div className="text-[10px] uppercase tracking-wider text-neutral-300 font-semibold drop-shadow">
                Баланс токенов
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight leading-snug drop-shadow-md">
                {tokens.toLocaleString('ru-RU')}{' '}
                <span className="text-xs font-bold text-amber-300">BLX</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowTokenInfo(true);
              }}
              title="Информация о токенах BLX"
              className="w-7 h-7 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md border border-white/25 flex items-center justify-center text-neutral-200 hover:text-white transition-all shadow-sm"
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
            className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.5)] text-white flex items-center justify-center active:scale-90 transition-all"
          >
            <ShoppingBag className="w-5 h-5 text-white drop-shadow" />
          </button>
        </div>
      </div>

      {/* Token Info Popup Modal */}
      {showTokenInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xs liquid-glass-card p-5 shadow-2xl relative text-white space-y-3 animate-spring-in">
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

              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25">
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

      {/* FULL BALANCES & RESOURCES SUMMARY (Liquid Glass) */}
      <div className="liquid-glass-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">
              Балансы и ресурсы аккаунта
            </span>
          </div>
          <button
            onClick={() => {
              triggerHaptic('medium');
              onOpenShop();
            }}
            className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1"
          >
            <span>Пополнить</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-0.5">
          {/* Balance Item 1: Tokens */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Токены BLX</span>
            <div className="text-base font-extrabold text-amber-300 font-mono mt-1">
              {tokens.toLocaleString('ru-RU')}
            </div>
            <span className="text-[10px] text-neutral-400 mt-0.5">
              {isPro ? '2 смс за токен' : '1 смс за токен'}
            </span>
          </div>

          {/* Balance Item 2: Daily limit */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Лимит на день</span>
            <div className="text-base font-extrabold text-white font-mono mt-1">
              {sentCount} <span className="text-xs text-neutral-400 font-normal">/ {totalLimit}</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5">
              Осталось: {Math.max(0, totalLimit - sentCount)}
            </span>
          </div>

          {/* Balance Item 3: Referral Bonus */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Реф. бонусы</span>
            <div className="text-base font-extrabold text-blue-400 font-mono mt-1">
              +{bonus}
            </div>
            <span className="text-[10px] text-neutral-400 mt-0.5">
              сообщений к лимиту
            </span>
          </div>

          {/* Balance Item 4: Account Slots */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Слоты номеров</span>
            <div className="text-base font-extrabold text-white font-mono mt-1">
              {accounts.length} <span className="text-xs text-neutral-400 font-normal">/ {plan.max_accounts}</span>
            </div>
            <span className="text-[10px] text-neutral-400 mt-0.5">
              {accounts.length >= plan.max_accounts ? 'Лимит слотов' : `Свободно: ${plan.max_accounts - accounts.length}`}
            </span>
          </div>

          {/* Balance Item 5: Sub Plan Duration */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Срок тарифа</span>
            <div className="text-base font-extrabold text-white font-mono mt-1 truncate">
              {expiresText}
            </div>
            <span className="text-[10px] text-neutral-400 mt-0.5">
              Тариф: {plan.name}
            </span>
          </div>

          {/* Balance Item 6: Autoresponder */}
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between">
            <span className="text-[10px] text-neutral-400 uppercase font-medium">Автоответчик</span>
            <div className="text-base font-extrabold text-emerald-400 font-mono mt-1">
              {user.auto_responder?.enabled ? 'Включен' : 'Выключен'}
            </div>
            <span className="text-[10px] text-neutral-400 mt-0.5">
              Ответов: {user.auto_responder?.total_replies_sent || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Referrals Card (Liquid Glass) */}
      <button
        onClick={() => {
          triggerHaptic('medium');
          onOpenReferrals();
        }}
        className="w-full p-4 liquid-glass-card flex items-center justify-between text-white active:scale-[0.99] text-left"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-white tracking-tight">Реферальная программа</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/15 text-neutral-200 border border-white/20">
                +{plan.ref_bonus} бонусов
              </span>
            </div>
            <p className="text-[12px] text-neutral-400 mt-0.5">
              Приглашайте друзей и получайте бесплатные сообщения к лимиту
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-neutral-300 flex-shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>

      {/* Plan Details & Limits Card (Liquid Glass) */}
      <div className="liquid-glass-card p-4 space-y-3">
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
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[12px] font-semibold transition-all flex items-center gap-1 active:scale-95 border border-white/15"
          >
            Тарифы
            <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
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
              className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full transition-all duration-300"
              style={{ width: `${limitPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span>Срок: {expiresText}</span>
            {bonus > 0 && <span className="text-amber-300">+{bonus} бонусных</span>}
          </div>
        </div>

        {/* Note on Free Watermark */}
        {user.sub_plan === 'free' && (
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
            <span>В тарифе Start добавляется вотермарка бота</span>
            <button
              onClick={() => onGoToTab('subscription')}
              className="text-amber-300 hover:underline font-semibold"
            >
              Снять в Pro →
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards: Accounts & Tasks (Liquid Glass) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          onClick={() => {
            triggerHaptic('light');
            onGoToTab('accounts');
          }}
          className="liquid-glass-card p-4 cursor-pointer hover:bg-white/[0.08] transition-all active:scale-95"
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
          className="liquid-glass-card p-4 cursor-pointer hover:bg-white/[0.08] transition-all active:scale-95"
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

