import React, { useState } from 'react';
import { UserProfile, PlanTier } from '../types';
import { SUBSCRIPTION_PLANS, botApi } from '../services/api';
import { Check, ArrowLeft, Zap, Crown, ChevronRight, ExternalLink } from 'lucide-react';
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
  const [fullScreenPlan, setFullScreenPlan] = useState<'pro' | 'premium' | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [paymentMethod, setPaymentMethod] = useState<'stars' | 'crypto'>('stars');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cryptoInvoice, setCryptoInvoice] = useState<{ url: string; id: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const plans = Object.values(SUBSCRIPTION_PLANS);
  const activePlan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;

  const calculatePrices = (planKey: 'pro' | 'premium', days: number) => {
    const plan = SUBSCRIPTION_PLANS[planKey];
    const stars = Math.max(1, Math.round((plan.price_stars / 30) * days));
    const usd = Number(((plan.price_usd / 30) * days).toFixed(2));
    return { stars, usd };
  };

  const handleOpenPlan = (planKey: PlanTier) => {
    if (planKey === 'pro' || planKey === 'premium') {
      triggerHaptic('medium');
      setSelectedDays(30);
      setStatusMessage(null);
      setCryptoInvoice(null);
      setFullScreenPlan(planKey);
    }
  };

  const handleBackToList = () => {
    triggerHaptic('light');
    setFullScreenPlan(null);
    setStatusMessage(null);
    setCryptoInvoice(null);
  };

  const handleBuy = async () => {
    if (!fullScreenPlan) return;
    triggerHaptic('medium');
    setIsProcessing(true);
    setStatusMessage(null);
    setCryptoInvoice(null);

    const plan = SUBSCRIPTION_PLANS[fullScreenPlan];
    const { stars, usd } = calculatePrices(fullScreenPlan, selectedDays);

    try {
      if (paymentMethod === 'stars') {
        setStatusMessage('Создание счета в Telegram Stars...');
        const res = await botApi.createStarsInvoiceLink(user.user_id, fullScreenPlan, selectedDays, stars);

        if (res.ok && res.invoice_link) {
          setStatusMessage('Счет создан. Открываем окно оплаты...');
          triggerHaptic('success');

          if (window.Telegram?.WebApp?.openInvoice) {
            window.Telegram.WebApp.openInvoice(res.invoice_link, async (status) => {
              if (status === 'paid') {
                triggerHaptic('success');
                const updated = await botApi.activateSubscription(user.user_id, fullScreenPlan, selectedDays);
                onUpdateUser(updated);
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
                alert(`Оплата принята! Подписка ${plan.name} активирована на ${selectedDays} дн.`);
                setFullScreenPlan(null);
              } else if (status === 'cancelled') {
                setStatusMessage('Оплата отменена');
              } else {
                setStatusMessage(`Статус: ${status}`);
              }
            });
          } else {
            window.open(res.invoice_link, '_blank');
            setStatusMessage('Инвойс Telegram Stars открыт в новом окне.');
          }
        } else {
          // Fallback direct activation
          const updated = await botApi.activateSubscription(user.user_id, fullScreenPlan, selectedDays);
          onUpdateUser(updated);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
          alert(`Подписка ${plan.name} активирована на ${selectedDays} дн.`);
          setFullScreenPlan(null);
        }
      } else {
        // CryptoBot payment
        setStatusMessage('Создание счета в CryptoBot...');
        const res = await botApi.createCryptoInvoice(user.user_id, fullScreenPlan, selectedDays, usd);
        if (res.ok && res.invoice_url) {
          setCryptoInvoice({ url: res.invoice_url, id: res.invoice_id || 0 });
          triggerHaptic('success');
          setStatusMessage('Счет USDT сформирован.');

          if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(res.invoice_url);
          }
        } else {
          alert('Ошибка создания счета: ' + (res.error || 'попробуйте позже'));
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Ошибка: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyCryptoPayment = async () => {
    if (!cryptoInvoice || !fullScreenPlan) return;
    triggerHaptic('medium');
    setIsProcessing(true);
    setStatusMessage('Проверка оплаты в CryptoBot...');

    try {
      const isPaid = await botApi.checkCryptoInvoice(cryptoInvoice.id);
      if (isPaid) {
        triggerHaptic('success');
        const updated = await botApi.activateSubscription(user.user_id, fullScreenPlan, selectedDays);
        onUpdateUser(updated);
        setCryptoInvoice(null);
        setStatusMessage(null);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
        alert(`Оплата получена! Подписка ${SUBSCRIPTION_PLANS[fullScreenPlan].name} активирована на ${selectedDays} дн.`);
        setFullScreenPlan(null);
      } else {
        triggerHaptic('warning');
        alert('Платеж пока не подтвержден в CryptoBot. Подождите немного и повторите проверку.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // FULLSCREEN MODE FOR PRO / PREMIUM PLAN
  if (fullScreenPlan) {
    const plan = SUBSCRIPTION_PLANS[fullScreenPlan];
    const isPro = fullScreenPlan === 'pro';
    const isCurrent = user.sub_plan === fullScreenPlan;
    const { stars, usd } = calculatePrices(fullScreenPlan, selectedDays);

    return (
      <div className="fixed inset-0 z-50 bg-[#08090d] text-white overflow-y-auto flex flex-col selection:bg-white selection:text-black">
        {/* Animated striped background overlay */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[#08090d]" />
          <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] ${
            isPro ? 'bg-blue-600/20' : 'bg-amber-500/20'
          }`} />
          <div className="absolute inset-0 bg-gray-stripes opacity-70" />
          <div className="absolute inset-0 bg-vertical-grid-stripes opacity-35" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,transparent_0%,rgba(0,0,0,0.7)_80%)]" />
        </div>

        {/* Top Header */}
        <div className="sticky top-0 z-20 px-4 py-3 bg-black/70 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors py-1 px-2.5 rounded-full bg-white/[0.06] active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Тарифы</span>
          </button>

          <span className="text-sm font-semibold text-white tracking-tight">
            {plan.name}
          </span>

          <div className="w-16 flex justify-end">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              isPro 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
            }`}>
              {plan.name}
            </span>
          </div>
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex-1 max-w-md w-full mx-auto p-4 space-y-4 pb-20">
          {/* Plan Hero Card */}
          <div className="apple-group-card p-5 text-center space-y-2">
            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-lg ${
              isPro 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
            }`}>
              {isPro ? <Zap className="w-7 h-7" /> : <Crown className="w-7 h-7" />}
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">
              Тариф {plan.name}
            </h1>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              {plan.daily_limit} сообщений в день, до {plan.max_accounts} аккаунтов
            </p>
          </div>

          {/* Slider for Days ("Передвигая полосочку") */}
          <div className="apple-group-card p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-400">Срок подписки:</span>
              <span className="text-base font-bold text-white font-mono bg-white/[0.08] px-3 py-1 rounded-xl">
                {selectedDays} {selectedDays === 1 ? 'день' : selectedDays < 5 ? 'дня' : 'дней'}
              </span>
            </div>

            {/* Range Slider */}
            <div className="space-y-2 pt-1">
              <input
                type="range"
                min={1}
                max={90}
                step={1}
                value={selectedDays}
                onChange={(e) => {
                  triggerHaptic('selection');
                  setSelectedDays(Number(e.target.value));
                }}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[11px] text-neutral-500 font-mono">
                <span>1 день</span>
                <span>30 дней</span>
                <span>60 дней</span>
                <span>90 дней</span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              {[7, 14, 30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedDays(d);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    selectedDays === d
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white/[0.05] text-neutral-400 hover:text-white'
                  }`}
                >
                  {d}д
                </button>
              ))}
            </div>
          </div>

          {/* Price Calculation Card */}
          <div className="apple-group-card p-4 space-y-3">
            <div className="text-xs font-medium text-neutral-400">Итого к оплате:</div>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-white font-mono">
                  {paymentMethod === 'stars' ? `${stars} ⭐` : `$${usd} USDT`}
                </span>
                <span className="text-xs text-neutral-500 font-mono">
                  на {selectedDays} дн.
                </span>
              </div>

              <span className="text-[11px] text-neutral-400 font-mono">
                {paymentMethod === 'stars' ? `≈ $${usd} USDT` : `≈ ${stars} ⭐`}
              </span>
            </div>
          </div>

          {/* Payment Method Switcher */}
          <div className="apple-group-card p-1 flex items-center gap-1">
            <button
              onClick={() => {
                triggerHaptic('selection');
                setPaymentMethod('stars');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                paymentMethod === 'stars'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Telegram Stars (⭐)
            </button>
            <button
              onClick={() => {
                triggerHaptic('selection');
                setPaymentMethod('crypto');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                paymentMethod === 'crypto'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              CryptoBot (USDT)
            </button>
          </div>

          {/* Status message */}
          {statusMessage && (
            <div className="p-3 bg-black/40 border border-white/[0.08] rounded-2xl text-xs text-neutral-300 font-mono">
              {statusMessage}
            </div>
          )}

          {/* CryptoBot Invoice */}
          {cryptoInvoice && (
            <div className="apple-group-card p-4 space-y-2.5">
              <div className="text-xs font-semibold text-white">Счет сформирован в CryptoBot</div>
              <div className="flex gap-2">
                <a
                  href={cryptoInvoice.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>Оплатить в CryptoBot</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={handleVerifyCryptoPayment}
                  disabled={isProcessing}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium"
                >
                  Проверить
                </button>
              </div>
            </div>
          )}

          {/* Features list */}
          <div className="apple-group-card p-4 space-y-2.5">
            <div className="text-xs font-medium text-neutral-400">Возможности тарифа:</div>
            {plan.features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-neutral-200">
                <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          {/* Pay Button */}
          <button
            disabled={isProcessing}
            onClick={handleBuy}
            className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isProcessing ? (
              'Обработка...'
            ) : (
              `Оплатить на ${selectedDays} дн. (${paymentMethod === 'stars' ? `${stars} ⭐` : `$${usd} USDT`})`
            )}
          </button>
        </div>
      </div>
    );
  }

  // DEFAULT VIEW: LIST OF PLANS
  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h2 className="text-[17px] font-semibold text-white tracking-tight">Тарифы</h2>
          <p className="text-[12px] text-neutral-400">
            Текущий тариф: <span className="text-white font-medium">{activePlan.name}</span>
          </p>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="space-y-3">
        {plans.map((p) => {
          const isCurrent = user.sub_plan === p.id;
          const isPaidPlan = p.id === 'pro' || p.id === 'premium';

          return (
            <div
              key={p.id}
              onClick={() => {
                if (isPaidPlan) {
                  handleOpenPlan(p.id as 'pro' | 'premium');
                }
              }}
              className={`apple-group-card p-4 transition-all space-y-3.5 ${
                isPaidPlan ? 'cursor-pointer hover:bg-white/[0.04] active:scale-[0.99]' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[15px] text-white tracking-tight">{p.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Текущий
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-neutral-400 mt-0.5 font-medium">
                    {p.id === 'free'
                      ? 'Базовый бесплатный доступ'
                      : `от ${p.price_stars} Stars ($${p.price_usd} USDT) / мес`}
                  </div>
                </div>

                {isPaidPlan ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenPlan(p.id as 'pro' | 'premium');
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span>Выбрать</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-neutral-400">
                    Базовый
                  </span>
                )}
              </div>

              {/* Features List */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                {p.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-[12px] text-neutral-300">
                    <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
