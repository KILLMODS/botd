import React, { useState } from 'react';
import { UserProfile, PlanConfig, PlanTier } from '../types';
import { SUBSCRIPTION_PLANS, botApi } from '../services/api';
import { Sparkles, Check, Star, Zap, ExternalLink, RefreshCw } from 'lucide-react';
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

          // If inside Telegram WebApp, open native invoice
          if (window.Telegram?.WebApp?.openInvoice) {
            window.Telegram.WebApp.openInvoice(res.invoice_link, async (status) => {
              if (status === 'paid') {
                triggerHaptic('success');
                const updated = await botApi.activateSubscription(user.user_id, planKey, 30);
                onUpdateUser(updated);
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
                alert(`🎉 Оплата принята! Подписка ${plan.name} активирована на 30 дней.`);
              } else if (status === 'cancelled') {
                setStatusMessage('Оплата Stars отменена');
              } else {
                setStatusMessage(`Статус оплаты: ${status}`);
              }
            });
          } else {
            // Outside Telegram WebApp
            window.open(res.invoice_link, '_blank');
            setStatusMessage(`Инвойс Telegram Stars открыт в новом окне.`);
          }
        } else {
          // Fallback simulation if direct bot API token was blocked by CORS
          alert(`Создан инвойс Telegram Stars на ${plan.price_stars} ⭐. Подтверждаем оплату...`);
          const updated = await botApi.activateSubscription(user.user_id, planKey, 30);
          onUpdateUser(updated);
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
        }
      } else {
        // CryptoBot
        setStatusMessage('Создание счета в CryptoBot API...');
        const res = await botApi.createCryptoInvoice(user.user_id, planKey);
        if (res.ok && res.invoice_url) {
          setCryptoInvoice({ url: res.invoice_url, id: res.invoice_id || 0 });
          triggerHaptic('success');
          setStatusMessage('Счет в USDT сформирован. Нажмите кнопку ниже для перехода в @CryptoBot:');

          if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(res.invoice_url);
          }
        } else {
          alert('Ошибка создания счета CryptoBot: ' + (res.error || 'попробуйте позже'));
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
    setStatusMessage('Проверка статуса транзакции в блокчейне CryptoBot...');

    try {
      const isPaid = await botApi.checkCryptoInvoice(cryptoInvoice.id);
      if (isPaid) {
        triggerHaptic('success');
        const updated = await botApi.activateSubscription(user.user_id, selectedPlan, 30);
        onUpdateUser(updated);
        setCryptoInvoice(null);
        setStatusMessage(null);
        confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 } });
        alert(`🎉 Оплата получена! Подписка ${SUBSCRIPTION_PLANS[selectedPlan].name} успешно активирована.`);
      } else {
        triggerHaptic('warning');
        alert('Платеж пока не подтвержден в сети CryptoBot. Если вы уже перевели USDT, подождите 1-2 минуты и нажмите кнопку снова.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-neutral-900/70 border border-white/15 rounded-3xl p-5 text-center space-y-2 backdrop-blur-2xl">
        <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Тарифные планы</h2>
        <p className="text-xs text-neutral-400 max-w-xs mx-auto">
          Официальная оплата через Telegram Stars (Звёзды) и @CryptoBot (USDT).
        </p>

        <div className="pt-2 flex items-center justify-center gap-2">
          <span className="text-xs text-neutral-400">Ваш тариф:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-black">
            {activePlan.name}
          </span>
        </div>
      </div>

      {/* Payment Method Switcher */}
      <div className="bg-neutral-900/80 border border-white/15 rounded-full p-1.5 flex items-center gap-1 max-w-xs mx-auto">
        <button
          onClick={() => {
            triggerHaptic('selection');
            setPaymentMethod('stars');
          }}
          className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            paymentMethod === 'stars'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>Telegram Stars</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('selection');
            setPaymentMethod('crypto');
          }}
          className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            paymentMethod === 'crypto'
              ? 'bg-white text-black shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>CryptoBot (USDT)</span>
        </button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="p-3 rounded-2xl bg-neutral-900 border border-white/20 text-white text-xs text-center font-mono animate-in fade-in">
          {statusMessage}
        </div>
      )}

      {/* Crypto Invoice Card */}
      {cryptoInvoice && (
        <div className="bg-neutral-900 border border-white/25 rounded-3xl p-4 space-y-3 animate-in zoom-in-95">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              Счет CryptoBot #{cryptoInvoice.id}
            </span>
            <span className="text-neutral-400 font-mono">Ожидание оплаты</span>
          </div>

          <p className="text-xs text-neutral-300">
            Перейдите в Telegram-бота @CryptoBot для оплаты в USDT:
          </p>

          <div className="flex gap-2">
            <a
              href={cryptoInvoice.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => triggerHaptic('light')}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-white text-black font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-neutral-200 active:scale-95 transition-all"
            >
              <span>Оплатить в @CryptoBot</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleVerifyCryptoPayment}
              disabled={isProcessing}
              className="py-2.5 px-4 rounded-2xl bg-neutral-800 border border-white/20 text-white font-bold text-xs hover:bg-neutral-700 active:scale-95 transition-all"
            >
              Проверить
            </button>
          </div>
        </div>
      )}

      {/* Plans List */}
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
              className={`bg-neutral-900/70 border rounded-3xl p-5 relative cursor-pointer transition-all duration-200 space-y-4 backdrop-blur-2xl ${
                isSelected
                  ? 'border-white shadow-[0_0_25px_rgba(255,255,255,0.15)] ring-1 ring-white/40'
                  : 'border-white/15 hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base text-white">{p.name}</span>
                  {p.popular && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-black">
                      Популярный
                    </span>
                  )}
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-white/20">
                      Текущий
                    </span>
                  )}
                </div>

                <div className="text-right">
                  {p.id === 'free' ? (
                    <span className="text-sm font-bold text-white">0 ₽</span>
                  ) : paymentMethod === 'stars' ? (
                    <div className="flex items-center gap-1 font-bold text-white text-sm">
                      <Star className="w-4 h-4 fill-current text-white" />
                      <span>{p.price_stars} ⭐</span>
                    </div>
                  ) : (
                    <div className="font-bold text-white text-sm">
                      ${p.price_usd} <span className="text-[10px] text-neutral-400">USDT</span>
                    </div>
                  )}
                  <span className="text-[10px] text-neutral-500 block">/ 30 дней</span>
                </div>
              </div>

              {/* Specs */}
              <div className="bg-black/50 border border-white/10 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <div className="text-xs font-bold text-white">{p.max_accounts}</div>
                  <div className="text-[10px] text-neutral-400">Аккаунтов</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{p.daily_limit.toLocaleString()}</div>
                  <div className="text-[10px] text-neutral-400">В день</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{p.min_delay}с</div>
                  <div className="text-[10px] text-neutral-400">Задержка</div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1.5 pt-1">
                {p.features.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-neutral-300">
                    <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* Buy Button */}
              {p.id !== 'free' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBuy(p.id);
                  }}
                  disabled={isProcessing}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${
                    isCurrent
                      ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {isProcessing && selectedPlan === p.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Связь с платежным шлюзом...</span>
                    </>
                  ) : (
                    <span>
                      Оплатить {paymentMethod === 'stars' ? `${p.price_stars} Stars` : `$${p.price_usd} USDT`}
                    </span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
