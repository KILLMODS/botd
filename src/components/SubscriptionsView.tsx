import React, { useState } from 'react';
import { UserProfile, PlanConfig, PlanTier } from '../types';
import { SUBSCRIPTION_PLANS, botApi } from '../services/api';
import { Check } from 'lucide-react';
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
  const [cryptoInvoice, setCryptoInvoice] = useState<{ url: string; id: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const plans = Object.values(SUBSCRIPTION_PLANS);
  const activePlan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;

  const handleBuy = async (planKey: PlanTier) => {
    triggerHaptic('medium');
    setIsProcessing(true);
    setStatusMessage(null);
    setCryptoInvoice(null);

    const plan = SUBSCRIPTION_PLANS[planKey];

    try {
      if (paymentMethod === 'stars') {
        setStatusMessage('Создание счета Telegram Stars...');
        const res = await botApi.createStarsInvoiceLink(user.user_id, planKey);

        if (res.ok && res.invoice_link) {
          setStatusMessage('Счет создан. Открываем окно оплаты...');
          triggerHaptic('success');

          if (window.Telegram?.WebApp?.openInvoice) {
            window.Telegram.WebApp.openInvoice(res.invoice_link, async (status) => {
              if (status === 'paid') {
                triggerHaptic('success');
                const updated = await botApi.activateSubscription(user.user_id, planKey, 30);
                onUpdateUser(updated);
                confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
                alert(`Оплата принята! Подписка ${plan.name} активирована на 30 дней.`);
              } else if (status === 'cancelled') {
                setStatusMessage('Оплата отменена');
              } else {
                setStatusMessage(`Статус: ${status}`);
              }
            });
          } else {
            window.open(res.invoice_link, '_blank');
            setStatusMessage(`Инвойс Telegram Stars открыт.`);
          }
        } else {
          // Fallback direct activation
          const updated = await botApi.activateSubscription(user.user_id, planKey, 30);
          onUpdateUser(updated);
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
        }
      } else {
        // CryptoBot
        setStatusMessage('Создание счета в CryptoBot...');
        const res = await botApi.createCryptoInvoice(user.user_id, planKey);
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
    if (!cryptoInvoice) return;
    triggerHaptic('medium');
    setIsProcessing(true);
    setStatusMessage('Проверка оплаты в сети CryptoBot...');

    try {
      const isPaid = await botApi.checkCryptoInvoice(cryptoInvoice.id);
      if (isPaid) {
        triggerHaptic('success');
        const updated = await botApi.activateSubscription(user.user_id, selectedPlan, 30);
        onUpdateUser(updated);
        setCryptoInvoice(null);
        setStatusMessage(null);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
        alert(`Оплата получена! Подписка активирована.`);
      } else {
        triggerHaptic('warning');
        alert('Платеж пока не подтвержден в CryptoBot. Подождите минуту и проверьте снова.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h2 className="text-[17px] font-semibold text-white tracking-tight">Тарифы и подписка</h2>
          <p className="text-[12px] text-neutral-400">
            Текущий тариф: <span className="text-white font-medium">{activePlan.name}</span>
          </p>
        </div>
      </div>

      {/* Payment Method Switcher (Apple Segmented Control) */}
      <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-1 flex items-center">
        <button
          onClick={() => {
            triggerHaptic('selection');
            setPaymentMethod('stars');
          }}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
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
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
            paymentMethod === 'crypto'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          CryptoBot (USDT)
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-black/40 border border-white/[0.08] rounded-2xl text-xs text-neutral-300 font-mono">
          {statusMessage}
        </div>
      )}

      {cryptoInvoice && (
        <div className="apple-group-card p-4 space-y-2.5">
          <div className="text-xs font-semibold text-white">Счет #{cryptoInvoice.id} создан в CryptoBot</div>
          <div className="flex gap-2">
            <a
              href={cryptoInvoice.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center shadow-md active:scale-95"
            >
              Оплатить в CryptoBot
            </a>
            <button
              onClick={handleVerifyCryptoPayment}
              disabled={isProcessing}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium"
            >
              Проверить
            </button>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="space-y-3">
        {plans.map((p) => {
          const isCurrent = user.sub_plan === p.id;
          const isSelected = selectedPlan === p.id;
          const isPaidPlan = p.id !== 'free';

          return (
            <div
              key={p.id}
              onClick={() => {
                if (isPaidPlan) {
                  triggerHaptic('selection');
                  setSelectedPlan(p.id as PlanTier);
                }
              }}
              className={`apple-group-card p-4 transition-all space-y-3.5 ${
                isSelected && isPaidPlan
                  ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                  : ''
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
                      ? 'Бесплатный базовый тариф'
                      : paymentMethod === 'stars'
                      ? `${p.price_stars} Stars / мес`
                      : `$${p.price_usd} USDT / мес`}
                  </div>
                </div>

                {isPaidPlan && (
                  <button
                    disabled={isProcessing || isCurrent}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBuy(p.id as PlanTier);
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all shadow-md active:scale-95 ${
                      isCurrent
                        ? 'bg-white/10 text-neutral-500 cursor-default'
                        : 'bg-white hover:bg-neutral-200 text-black'
                    }`}
                  >
                    {isCurrent ? 'Активен' : 'Оформить'}
                  </button>
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
