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
          <h2 className="text-base font-semibold text-white">Подписка</h2>
          <p className="text-xs text-neutral-400">
            Текущий тариф: <span className="text-white font-medium">{activePlan.name}</span>
          </p>
        </div>
      </div>

      {/* Payment Method Switcher */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-1 flex items-center">
        <button
          onClick={() => {
            triggerHaptic('selection');
            setPaymentMethod('stars');
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            paymentMethod === 'stars'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Telegram Stars
        </button>
        <button
          onClick={() => {
            triggerHaptic('selection');
            setPaymentMethod('crypto');
          }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            paymentMethod === 'crypto'
              ? 'bg-neutral-800 text-white'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          CryptoBot (USDT)
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-300 font-mono">
          {statusMessage}
        </div>
      )}

      {cryptoInvoice && (
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2.5">
          <div className="text-xs font-semibold text-white">Счет #{cryptoInvoice.id} создан</div>
          <div className="flex gap-2">
            <a
              href={cryptoInvoice.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2 px-3 rounded-lg bg-white text-black text-xs font-medium text-center"
            >
              Оплатить в CryptoBot
            </a>
            <button
              onClick={handleVerifyCryptoPayment}
              disabled={isProcessing}
              className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium"
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
              className={`bg-neutral-900/60 border rounded-2xl p-4 transition-colors space-y-3 ${
                isSelected && isPaidPlan
                  ? 'border-neutral-500'
                  : 'border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-white">{p.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300">
                        Текущий
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'bg-neutral-800 text-neutral-500 cursor-default'
                        : 'bg-white hover:bg-neutral-200 text-black'
                    }`}
                  >
                    {isCurrent ? 'Активен' : 'Оформить'}
                  </button>
                )}
              </div>

              {/* Features List */}
              <div className="space-y-1.5 pt-1 border-t border-neutral-800/60">
                {p.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-neutral-400">
                    <Check className="w-3.5 h-3.5 text-neutral-300 flex-shrink-0" />
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
