import React, { useState } from 'react';
import { UserProfile } from '../types';
import { SUBSCRIPTION_PLANS, botApi } from '../services/api';
import { Check, Zap, Star, ExternalLink, Sparkles, Info, ShoppingBag, Coins, Bot } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import confetti from 'canvas-confetti';
import { TokenShopModal } from './TokenShopModal';

interface SubscriptionsViewProps {
  user: UserProfile;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  user,
  onUpdateUser,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'pro' | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [paymentMethod, setPaymentMethod] = useState<'stars' | 'crypto'>('stars');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cryptoInvoiceUrl, setCryptoInvoiceUrl] = useState<string | null>(null);
  const [showTokenInfo, setShowTokenInfo] = useState(false);
  const [isTokenShopOpen, setIsTokenShopOpen] = useState(false);

  const startPlan = SUBSCRIPTION_PLANS.free;
  const proPlan = SUBSCRIPTION_PLANS.pro;
  const isPro = user.sub_plan === 'pro' || user.sub_plan === 'premium';

  const calculatePrices = (days: number) => {
    const stars = Math.max(1, Math.round((proPlan.price_stars / 30) * days));
    const usd = Number(((proPlan.price_usd / 30) * days).toFixed(2));
    return { stars, usd };
  };

  const { stars: costStars, usd: costUsd } = calculatePrices(selectedDays);

  const handleBuyPro = async () => {
    triggerHaptic('medium');
    setIsProcessing(true);
    setStatusMessage(null);
    setCryptoInvoiceUrl(null);

    try {
      if (paymentMethod === 'stars') {
        setStatusMessage('Создание счёта в Telegram Stars...');
        const res = await botApi.createStarsInvoiceLink(user.user_id, 'pro', selectedDays, costStars);

        if (res.ok && res.invoice_link) {
          triggerHaptic('success');
          setStatusMessage('Счёт готов! Открываем оплату Telegram Stars...');

          if (window.Telegram?.WebApp?.openInvoice) {
            window.Telegram.WebApp.openInvoice(res.invoice_link, async (status) => {
              if (status === 'paid') {
                triggerHaptic('success');
                const updated = await botApi.activateSubscription(user.user_id, 'pro', selectedDays);
                onUpdateUser(updated);
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
                alert(`Оплата принята! Подписка Pro успешно активирована на ${selectedDays} дней.`);
                setSelectedPlan(null);
              } else if (status === 'cancelled') {
                setStatusMessage('Оплата Stars отменена');
              } else if (status === 'failed') {
                setStatusMessage('Ошибка при оплате Stars. Проверьте баланс звёзд.');
              } else {
                setStatusMessage(`Статус: ${status}`);
              }
            });
          } else {
            if (window.Telegram?.WebApp?.openTelegramLink) {
              window.Telegram.WebApp.openTelegramLink(res.invoice_link);
            } else {
              window.open(res.invoice_link, '_blank');
            }
            setStatusMessage('Счёт Telegram Stars открыт.');
          }
        } else {
          setStatusMessage(res.error || 'Не удалось сформировать счёт Stars');
          triggerHaptic('error');
        }
      } else {
        // CryptoBot
        setStatusMessage('Создание счёта в CryptoBot (USDT)...');
        const res = await botApi.createCryptoInvoice(user.user_id, 'pro', selectedDays, costUsd);

        if (res.ok && res.invoice_url) {
          setCryptoInvoiceUrl(res.invoice_url);
          setStatusMessage('Инвойс CryptoBot сформирован! Нажмите ссылку ниже.');
          triggerHaptic('success');

          if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(res.invoice_url);
          } else {
            window.open(res.invoice_url, '_blank');
          }
        } else {
          setStatusMessage(res.error || 'Не удалось сформировать инвойс CryptoBot');
          triggerHaptic('error');
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatusMessage(`Ошибка: ${msg}`);
      triggerHaptic('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-fade-in select-none">
      {/* Header Banner (Liquid Glass) */}
      <div className="liquid-glass-card p-4.5 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
            Экономика рассылок TG Broadcaster
          </span>
          <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
            Тарифы Start и Pro
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Текущий статус:{' '}
            <span className="font-semibold text-white">{isPro ? 'Pro (x2 выгода)' : 'Start'}</span>
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium');
            setIsTokenShopOpen(true);
          }}
          className="py-2.5 px-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.1] text-white font-medium text-xs flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Магазин BLX</span>
        </button>
      </div>

      {/* Start Plan Card (Liquid Glass) */}
      <div className="liquid-glass-card p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Start</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-white/10 text-neutral-300 border border-white/10">
                Базовый
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Бесплатный стартовый тариф для знакомства с ботом
            </p>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-white">0 ₽</div>
            <div className="text-[11px] text-neutral-400 font-mono">Бессрочно</div>
          </div>
        </div>

        {/* Token Rule Box with Info Button */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-300" />
            <div>
              <div className="text-xs font-semibold text-white">Токены BLX — это сообщения</div>
              <div className="text-[11px] text-neutral-400">1 BLX = 1 сообщение • Лимиты в день: ∞</div>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              setShowTokenInfo(true);
            }}
            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        <ul className="space-y-2 text-xs text-neutral-300 pt-1">
          {startPlan.features.map((feat, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-neutral-400 flex-shrink-0" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>

        <div className="pt-2">
          {!isPro ? (
            <div className="w-full py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-center text-xs font-medium text-neutral-400">
              Ваш активный тариф
            </div>
          ) : (
            <div className="text-xs text-neutral-500 text-center">
              Вы улучшили тариф до Pro
            </div>
          )}
        </div>
      </div>

      {/* Pro Plan Card (Liquid Glass) */}
      <div className="liquid-glass-card p-5 space-y-4 border border-white/[0.18] relative overflow-hidden">
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Pro</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-white/10 text-white border border-white/15">
                Рекомендуем
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Максимальная скорость, рассылка по ЛС, чистые посты и обход PR-ботов
            </p>
          </div>

          <div className="text-right">
            <div className="text-lg font-bold text-white flex items-center justify-end gap-1 font-mono">
              <span>69</span>
              <Star className="w-4 h-4 fill-amber-300 text-amber-300 inline" />
            </div>
            <div className="text-xs text-neutral-400 font-mono mt-0.5">
              или $1.50 USDT / месяц
            </div>
          </div>
        </div>

        {/* Pro Advantage Highlight */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-amber-300 shrink-0">
              <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Преимущества подписки Pro:</div>
              <div className="text-[11px] text-neutral-300">
                Чистые посты без вотермарок, рассылка по участникам (ЛС), анти-спамблок и премиум эмодзи.
              </div>
            </div>
          </div>
        </div>

        <ul className="space-y-2 text-xs text-neutral-300 pt-1 relative z-10">
          {proPlan.features.map((feat, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-white flex-shrink-0" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>

        {/* Duration Selector when clicking Subscribe */}
        {selectedPlan === 'pro' ? (
          <div className="pt-2 space-y-3 relative z-10 border-t border-white/[0.08]">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-neutral-300">Срок продления:</span>
              <span className="font-mono text-white font-semibold">
                {costStars} Stars / ${costUsd} USDT
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[7, 15, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedDays(days);
                  }}
                  className={`py-2 rounded-xl text-xs font-medium transition-all border ${
                    selectedDays === days
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-white/[0.03] border-white/[0.06] text-neutral-400 hover:text-white'
                  }`}
                >
                  {days} дн.
                </button>
              ))}
            </div>

            {/* Payment Method Switcher */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setPaymentMethod('stars');
                }}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'stars'
                    ? 'bg-white/10 border-white/20 text-white font-semibold'
                    : 'bg-white/[0.03] border-white/[0.06] text-neutral-400'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>Stars ({costStars})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setPaymentMethod('crypto');
                }}
                className={`py-2.5 px-3 rounded-2xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'crypto'
                    ? 'bg-white/10 border-white/20 text-white font-semibold'
                    : 'bg-white/[0.03] border-white/[0.06] text-neutral-400'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-neutral-300" />
                <span>CryptoBot (${costUsd})</span>
              </button>
            </div>

            {statusMessage && (
              <div className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-center text-neutral-200">
                {statusMessage}
              </div>
            )}

            {cryptoInvoiceUrl ? (
              <a
                href={cryptoInvoiceUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => triggerHaptic('medium')}
                className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>Оплатить ${costUsd} USDT в CryptoBot</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="w-1/3 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-neutral-300"
                >
                  Отмена
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleBuyPro}
                  className="flex-1 py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Подготовка счёта...</span>
                    </>
                  ) : (
                    <span>
                      Оплатить {paymentMethod === 'stars' ? `${costStars} Stars` : `$${costUsd} USDT`}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setSelectedPlan('pro');
            }}
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] relative z-10"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isPro ? 'Продлить подписку Pro (69 Stars)' : 'Перейти на Pro за 69 Stars ($1.50)'}</span>
          </button>
        )}
      </div>

      {/* Info Modal on Tokens */}
      {showTokenInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-spring-in">
          <div className="w-full max-w-xs bg-[#16171e]/90 border border-white/[0.14] rounded-[24px] p-5 shadow-2xl relative text-white space-y-3">
            <div className="flex items-center gap-2 pb-2.5 border-b border-white/[0.08]">
              <Coins className="w-5 h-5 text-amber-300" />
              <h4 className="text-sm font-bold text-white">Токены и сообщения</h4>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              <strong>Токены — это сообщения.</strong> 1 токен = 1 отправленное сообщение в рассылке.
            </p>

            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-200">
              Дневные лимиты <strong>бесконечные (∞)</strong>. Вы можете запускать кампании любого масштаба, пока на вашем балансе есть токены.
            </div>

            <button
              onClick={() => setShowTokenInfo(false)}
              className="w-full py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-semibold transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Token Shop Modal */}
      {isTokenShopOpen && (
        <TokenShopModal
          user={user}
          onClose={() => setIsTokenShopOpen(false)}
          onUpdateUser={onUpdateUser}
        />
      )}
    </div>
  );
};
