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
  const tokens = user.tokens_balance ?? 0;
  const bonus = user.bonus_messages || 0;

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

        {/* Bottom Row: Tokens Balance + Shop Button */}
        <div className="flex items-end justify-between relative z-10 pt-2">
          {/* Clean Tokens Display with Info Button */}
          <div className="flex items-center gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neutral-300 font-semibold drop-shadow">
                Баланс токенов BLX
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
            title="Магазин BLX"
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
              <strong>Токены BLX — это ваши сообщения:</strong>
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="font-semibold text-white">Прямой расчёт:</div>
                <div className="text-neutral-300 mt-0.5">
                  • <strong>1 BLX = 1 отправленное сообщение</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/25">
                <div className="font-semibold text-amber-300">Стартовый бонус:</div>
                <div className="text-neutral-200 mt-0.5">
                  • При старте подписки начисляется <strong>+500 BLX токенов</strong>!
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-400/10 border border-emerald-400/25">
                <div className="font-semibold text-emerald-300">Бесконечные лимиты:</div>
                <div className="text-neutral-200 mt-0.5">
                  • Вы можете отправлять столько сообщений, сколько BLX токенов на балансе!
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
              <span>Купить токены BLX в магазине</span>
            </button>
          </div>
        </div>
      )}

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
                +{plan.ref_bonus} токенов
              </span>
            </div>
            <p className="text-[12px] text-neutral-400 mt-0.5">
              Приглашайте друзей и получайте бесплатные токены (сообщения)
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-neutral-300 flex-shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>

      {/* Plan Details & Infinite Limits Card (Liquid Glass) */}
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

        {/* Infinite Limits & Messages Balance Info */}
        <div className="pt-2 space-y-2 border-t border-white/[0.08]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Дневной лимит сообщений:</span>
            <span className="font-semibold text-emerald-400">Бесконечный (∞)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Доступно к отправке:</span>
            <span className="font-mono text-white font-bold">{tokens.toLocaleString('ru-RU')} сообщений</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span>Срок подписки: {expiresText}</span>
            {bonus > 0 && <span className="text-amber-300">+{bonus} бонусных токенов</span>}
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
            {accounts.length}
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

