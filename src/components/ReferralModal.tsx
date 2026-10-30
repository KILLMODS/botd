import React, { useState, useEffect } from 'react';
import { X, Users, Copy, Check, Share2, Gift, Sparkles, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { botApi, SUBSCRIPTION_PLANS } from '../services/api';
import { ReferralInfo, UserProfile } from '../types';

interface ReferralModalProps {
  user: UserProfile;
  onClose: () => void;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ user, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [refInfo, setRefInfo] = useState<ReferralInfo>({
    total_invited: user.referrals_count || 0,
    active_invited: user.referrals_active || 0,
    bonus_messages: user.bonus_messages || 0,
    referral_link: `https://t.me/tg_broadcaster_bot?start=ref_${user.user_id}`
  });
  const [isLoading, setIsLoading] = useState(true);

  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;

  useEffect(() => {
    botApi.getReferralInfo(user.user_id).then(info => {
      setRefInfo(info);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [user.user_id]);

  const handleCopy = () => {
    triggerHaptic('success');
    navigator.clipboard.writeText(refInfo.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleShare = () => {
    triggerHaptic('medium');
    const text = encodeURIComponent('Присоединяйся к TG Broadcaster — мощный инструмент для рассылок в Telegram!');
    const url = encodeURIComponent(refInfo.referral_link);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Реферальная программа</h3>
              <p className="text-[11px] text-neutral-400">Приглашайте друзей и получайте сообщения</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] text-neutral-400">Перешли</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {isLoading ? '...' : refInfo.total_invited}
            </div>
          </div>
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] text-neutral-400">Подключили</div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {isLoading ? '...' : refInfo.active_invited}
            </div>
          </div>
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-3 text-center">
            <div className="text-[10px] text-neutral-400">Бонус</div>
            <div className="text-lg font-bold text-blue-400 font-mono mt-0.5">
              +{isLoading ? '...' : refInfo.bonus_messages}
            </div>
          </div>
        </div>

        {/* Referral Link Box */}
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-neutral-300">Ваша пригласительная ссылка:</div>
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl p-2.5">
            <div className="text-xs text-neutral-300 font-mono truncate flex-1 select-all">
              {refInfo.referral_link}
            </div>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Скопировано' : 'Копия'}</span>
            </button>
          </div>
        </div>

        {/* Action Button: Share */}
        <button
          onClick={handleShare}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
        >
          <Share2 className="w-4 h-4" />
          <span>Поделиться в Telegram</span>
        </button>

        {/* Tiers Reward Explanation */}
        <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Gift className="w-4 h-4 text-amber-400" />
            <span>Награды за подключение аккаунта:</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className={`flex items-center justify-between p-2 rounded-xl border ${
              user.sub_plan === 'free' ? 'bg-neutral-800/80 border-neutral-700' : 'bg-neutral-900/40 border-neutral-800/50'
            }`}>
              <span className="text-neutral-300">Тариф Free (Старт)</span>
              <span className="font-semibold text-white font-mono">+50 сообщений</span>
            </div>
            <div className={`flex items-center justify-between p-2 rounded-xl border ${
              user.sub_plan === 'pro' ? 'bg-neutral-800/80 border-blue-500/40' : 'bg-neutral-900/40 border-neutral-800/50'
            }`}>
              <span className="text-neutral-300">Тариф Pro</span>
              <span className="font-semibold text-blue-400 font-mono">+100 сообщений</span>
            </div>
            <div className={`flex items-center justify-between p-2 rounded-xl border ${
              user.sub_plan === 'premium' ? 'bg-neutral-800/80 border-purple-500/40' : 'bg-neutral-900/40 border-neutral-800/50'
            }`}>
              <span className="text-neutral-300">Тариф Premium+</span>
              <span className="font-semibold text-purple-400 font-mono">+230 сообщений</span>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              Бонус начисляется только один раз, когда реферал успешно добавит и авторизует рабочий аккаунт. Защита от накрутки и самоприглашений активна.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
