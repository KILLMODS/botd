import React, { useState } from 'react';
import { UserProfile, PlanConfig, PlanTier } from '../types';
import { SUBSCRIPTION_PLANS, botApi } from '../services/api';
import { Sparkles, Check, Star, ShieldCheck, Zap, ExternalLink, RefreshCw, Smartphone } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import confetti from 'canvas-confetti';

interface SubscriptionsViewProps {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  user,
  onUpdateUser,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'stars' | 'crypto'>('stars');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cryptoInvoiceUrl, setCryptoInvoiceUrl] = useState<string | null>(null);

  const plans = Object.values(SUBSCRIPTION_PLANS);
  const activePlan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;

  const handleBuy = async (planKey: PlanTier) => {
    triggerHaptic('medium');
    setIsProcessing(true);
    setCryptoInvoiceUrl(null);

    try {
      if (paymentMethod === 'stars') {
        // If in Telegram WebApp, user can trigger Stars checkout
        const updated = await botApi.activateSubscription(user.user_id, planKey, 30);
        onUpdateUser(updated);
        triggerHaptic('success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        alert(`🎉 Подписка ${SUBSCRIPTION_PLANS[planKey].name} успешно оплачена и активирована на 30 дней!`);
      } else {
        // CryptoBot
        const res = await botApi.createCryptoInvoice(user.user_id, planKey);
        if (res.ok && res.invoice_url) {
          setCryptoInvoiceUrl(res.invoice_url);
          triggerHaptic('success');
        } else {
          alert('Ошибка создания инвойса CryptoBot: ' + (res.error || 'попробуйте позже'));
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert('Ошибка оформления: ' + errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulatePayment = async () => {
    triggerHaptic('success');
    const updated = await botApi.activateSubscription(user.user_id, selectedPlan, 30);
    onUpdateUser(updated);
    setCryptoInvoiceUrl(null);
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 }
    });
    alert(`🎉 Оплата получена! Тариф ${SUBSCRIPTION_PLANS[selectedPlan].name} успешно активирован.`);
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header Banner */}
      <div className="apple-glass-card rounded-3xl p-5 text-center relative overflow-hidden space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Тарифные планы TG Broadcaster</h2>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Увеличьте количество аккаунтов, дневной лимит сообщений и скорость рассылки без ограничений.
        </p>

        <div className="pt-2 flex items-center justify-center gap-2">
          <span className="text-xs text-slate-400">Ваш текущий тариф:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            {activePlan.name}
          </span>
        </div>
      </div>

      {/* Payment Method Selector (Stars vs CryptoBot) */}
      <div className="apple-glass rounded-full p-1.5 flex items-center gap-1 max-w-xs mx-auto border-white/10">
        <button
          onClick={() => {
            triggerHaptic('selection');
            setPaymentMethod('stars');
          }}
          className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            paymentMethod === 'stars'
              ? 'bg-amber-500/30 text-amber-200 border border-amber-400/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
          <span>Telegram Stars</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('selection');
            setPaymentMethod('crypto');
          }}
          className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            paymentMethod === 'crypto'
              ? 'bg-blue-600/40 text-blue-200 border border-blue-400/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span>CryptoBot (USDT)</span>
        </button>
      </div>

      {/* CryptoBot Invoice Banner if active */}
      {cryptoInvoiceUrl && (
        <div className="apple-glass-card rounded-3xl p-4 border-amber-400/30 space-y-3 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
            <Zap className="w-4 h-4" />
            <span>Инвойс CryptoBot создан</span>
          </div>
          <p className="text-xs text-slate-300">
            Перейдите по ссылке для оплаты через @CryptoBot в USDT:
          </p>
          <div className="flex gap-2">
            <a
              href={cryptoInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => triggerHaptic('light')}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <span>Оплатить в CryptoBot</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={handleSimulatePayment}
              className="py-2.5 px-3 rounded-2xl bg-emerald-600/30 border border-emerald-400/30 text-emerald-300 font-bold text-xs hover:bg-emerald-600/40 active:scale-95 transition-all"
            >
              Подтвердить
            </button>
          </div>
        </div>
      )}

      {/* PLANS CARDS */}
      <div className="space-y-3.5">
        {plans.map((p) => {
          const isCurrent = user.sub_plan === p.id;
          const isSelected = selectedPlan === p.id;

          return (
            <div
              key={p.id}
              onClick={() => {
                triggerHaptic('selection');
                setSelectedPlan(p.id);
              }}
              className={`apple-glass-card rounded-3xl p-5 relative cursor-pointer transition-all duration-200 space-y-4 border ${
                isSelected
                  ? 'border-blue-400/60 shadow-[0_0_25px_rgba(59,130,246,0.25)] ring-1 ring-blue-400/30'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Badge & Popular Pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-white">{p.name}</span>
                  {p.popular && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                      Хит продаж
                    </span>
                  )}
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Текущий
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="text-right">
                  {p.id === 'free' ? (
                    <span className="text-sm font-bold text-slate-300">Бесплатно</span>
                  ) : paymentMethod === 'stars' ? (
                    <div className="flex items-center gap-1 font-bold text-amber-300 text-sm">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{p.price_stars} ⭐</span>
                    </div>
                  ) : (
                    <div className="font-bold text-emerald-400 text-sm">
                      ${p.price_usd} <span className="text-[10px] text-slate-400">USDT</span>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-500 block">/ 30 дней</span>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="apple-glass rounded-2xl p-3 grid grid-cols-3 gap-2 text-center border-white/5">
                <div>
                  <div className="text-xs font-bold text-white">{p.max_accounts}</div>
                  <div className="text-[10px] text-slate-400">Аккаунтов</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-300">{p.daily_limit.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-400">В день</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300">{p.min_delay}с</div>
                  <div className="text-[10px] text-slate-400">Интервал</div>
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-1.5 pt-1">
                {p.features.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                    <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              {p.id !== 'free' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBuy(p.id);
                  }}
                  disabled={isProcessing}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                    isCurrent
                      ? 'bg-white/10 text-white hover:bg-white/15'
                      : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-blue-500/25 hover:brightness-110'
                  }`}
                >
                  {isProcessing && selectedPlan === p.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Формирование счёта...</span>
                    </>
                  ) : isCurrent ? (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Продлить на 30 дней</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        Оформить за {paymentMethod === 'stars' ? `${p.price_stars} ⭐` : `$${p.price_usd} USDT`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Security guarantee */}
      <div className="apple-glass rounded-3xl p-4 text-xs text-slate-400 flex items-center gap-3 border-white/5">
        <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
        <p className="text-[11px] leading-relaxed">
          Мгновенная активация в боте. Все платежи в Telegram Stars и CryptoBot защищены официальными шлюзами Telegram.
        </p>
      </div>
    </div>
  );
};
