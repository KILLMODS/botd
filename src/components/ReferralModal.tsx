import React, { useState, useEffect } from 'react';
import { X, Users, Copy, Check, Share2, Gift, Sparkles, ShieldCheck } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { botApi, SUBSCRIPTION_PLANS, BOT_USERNAME } from '../services/api';
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
    referral_link: `https://t.me/${BOT_USERNAME}?start=ref_${user.user_id}`
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
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md liquid-glass-card border-t border-x sm:border border-white/[0.18] rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-sheet-spring text-white shadow-2xl"
      >
        {/* Grab Handle for bottom sheet */}
        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto -mt-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center text-blue-400 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Реферальная программа</h3>
              <p className="text-[11px] text-neutral-400">Приглашайте друзей и получайте сообщения</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simplified 3-Stat Counters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-center">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Перешли</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">
              {isLoading ? '...' : refInfo.total_invited}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-center">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Подключили</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
              {isLoading ? '...' : refInfo.active_invited}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-center">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Бонусы</div>
            <div className="text-xl font-bold text-blue-400 font-mono mt-0.5">
              +{isLoading ? '...' : refInfo.bonus_messages}
            </div>
          </div>
        </div>

        {/* Referral Link Box */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-neutral-300">Ваша персональная ссылка:</div>
          <div className="flex items-center gap-2 bg-[#12131c] border border-white/15 rounded-2xl p-2.5">
            <div className="text-xs text-neutral-300 font-mono truncate flex-1 select-all px-1">
              {refInfo.referral_link}
            </div>
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ${
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
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4" />
          <span>Поделиться ссылкой в Telegram</span>
        </button>

        {/* Corrected Clean Tiers Reward Box (Start & Pro ONLY) */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Gift className="w-4 h-4 text-amber-300" />
            <span>Награды за подключение первого аккаунта другом:</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
              user.sub_plan === 'free' ? 'bg-white/[0.08] border-white/20' : 'bg-white/[0.02] border-white/[0.06]'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Тариф Start</span>
                {user.sub_plan === 'free' && (
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-white/10 text-neutral-300 font-bold">Ваш тариф</span>
                )}
              </div>
              <span className="font-bold text-white font-mono">+50 BLX</span>
            </div>

            <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
              user.sub_plan === 'pro' || user.sub_plan === 'premium' ? 'bg-blue-500/15 border-blue-400/30' : 'bg-white/[0.02] border-white/[0.06]'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-300">Тариф Pro</span>
                {(user.sub_plan === 'pro' || user.sub_plan === 'premium') && (
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">Ваш тариф</span>
                )}
              </div>
              <span className="font-bold text-blue-400 font-mono">+100 BLX</span>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-neutral-400 leading-snug">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>
              Бонус начисляется сразу, как только приглашённый пользователь привяжет свой рабочий аккаунт.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
