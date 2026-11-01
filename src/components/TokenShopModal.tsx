import React, { useState } from 'react';
import { X, Star, Zap, ExternalLink, ArrowRight, Info, Coins, Bot } from 'lucide-react';
import { UserProfile, TokenPackage } from '../types';
import { TOKEN_PACKAGES, botApi } from '../services/api';
import { triggerHaptic } from '../services/telegram';
import confetti from 'canvas-confetti';

interface TokenShopModalProps {
  user: UserProfile;
  onClose: () => void;
  onUpdateUser: (updated: UserProfile) => void;
}

export const TokenShopModal: React.FC<TokenShopModalProps> = ({
  user,
  onClose,
  onUpdateUser,
}) => {
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage>(TOKEN_PACKAGES[1]);
  const [paymentMethod, setPaymentMethod] = useState<'stars' | 'crypto'>('stars');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cryptoUrl, setCryptoUrl] = useState<string | null>(null);

  const isPro = user.sub_plan === 'pro' || user.sub_plan === 'premium';
  const multiplierText = isPro ? '2 сообщения за 1 токен (PRO)' : '1 сообщение за 1 токен';

  const handleBuy = async () => {
    triggerHaptic('medium');
    setIsProcessing(true);
    setStatusMessage(null);
    setCryptoUrl(null);

    try {
      if (paymentMethod === 'stars') {
        setStatusMessage('Формирование счёта в Telegram Stars...');
        const res = await botApi.createTokenStarsInvoice(
          user.user_id,
          selectedPackage.id,
          selectedPackage.tokens,
          selectedPackage.price_stars
        );

        if (res.ok && res.invoice_link) {
          triggerHaptic('success');
          setStatusMessage('Счёт готов! Открываем оплату Stars...');

          if (window.Telegram?.WebApp?.openInvoice) {
            window.Telegram.WebApp.openInvoice(res.invoice_link, async (status) => {
              if (status === 'paid') {
                triggerHaptic('success');
                const updated = await botApi.addTokens(user.user_id, selectedPackage.tokens);
                onUpdateUser(updated);
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
                alert(`Оплата принята! Баланс пополнен на +${selectedPackage.tokens.toLocaleString('ru-RU')} BLX токенов.`);
                onClose();
              } else if (status === 'cancelled') {
                setStatusMessage('Оплата Stars отменена.');
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
            setStatusMessage('Инвойс Stars открыт. После оплаты баланс обновится автоматически.');
          }
        } else {
          setStatusMessage(res.error || 'Не удалось сформировать счёт Stars');
          triggerHaptic('error');
        }
      } else {
        // CryptoBot
        setStatusMessage('Формирование счёта в CryptoBot (USDT)...');
        const res = await botApi.createTokenCryptoInvoice(
          user.user_id,
          selectedPackage.id,
          selectedPackage.tokens,
          selectedPackage.price_usd
        );

        if (res.ok && res.invoice_url) {
          setCryptoUrl(res.invoice_url);
          setStatusMessage('Инвойс CryptoBot создан! Нажмите кнопку ниже для оплаты.');
          triggerHaptic('success');

          if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(res.invoice_url);
          } else {
            window.open(res.invoice_url, '_blank');
          }
        } else {
          setStatusMessage(res.error || 'Не удалось создать инвойс в CryptoBot');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xl transition-opacity">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#16171e]/90 backdrop-blur-2xl border border-white/[0.12] rounded-[28px] p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto relative text-white animate-spring-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-amber-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Магазин токенов BLX</h3>
              <p className="text-[11px] text-neutral-400">Пополнение баланса для отправки рассылок</p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white transition-all active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Balance & Multiplier Badge */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-neutral-400">Ваш текущий баланс</div>
            <div className="text-lg font-bold text-white font-mono flex items-center gap-1.5 mt-0.5">
              <Coins className="w-4 h-4 text-amber-300" />
              <span>{(user.tokens_balance ?? 500).toLocaleString('ru-RU')}</span>
              <span className="text-xs font-medium text-neutral-400">BLX</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isPro 
                ? 'bg-blue-500/15 text-blue-300 border-blue-400/25'
                : 'bg-white/10 text-neutral-300 border-white/10'
            }`}>
              <Zap className="w-3 h-3 text-amber-300" />
              {multiplierText}
            </span>
            <div className="text-[10px] text-neutral-400 mt-1">
              {isPro ? 'У вас тариф Pro: x2 выгода' : 'Тариф Start: 1 токен = 1 смс'}
            </div>
          </div>
        </div>

        {/* Package Selector */}
        <div className="mt-4 space-y-2">
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
            Выберите объём токенов
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TOKEN_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.id === pkg.id;
              const messagesCount = isPro ? pkg.tokens * 2 : pkg.tokens;

              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedPackage(pkg);
                  }}
                  className={`relative p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between active:scale-[0.98] ${
                    isSelected
                      ? 'bg-white/[0.08] border-white/25 shadow-md'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
                  }`}
                >
                  {pkg.discount && (
                    <span className="absolute -top-2 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                      {pkg.discount}
                    </span>
                  )}
                  {pkg.popular && !pkg.discount && (
                    <span className="absolute -top-2 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                      Хит
                    </span>
                  )}

                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                      <Coins className="w-3.5 h-3.5 text-amber-300" />
                      <span>{pkg.tokens.toLocaleString('ru-RU')}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      ≈ {messagesCount.toLocaleString('ru-RU')} сообщений
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-1">
                      {pkg.price_stars} <Star className="w-3 h-3 fill-amber-300 text-amber-300 inline" />
                    </span>
                    <span className="text-neutral-400 font-mono text-[11px]">
                      ${pkg.price_usd}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Method Switcher */}
        <div className="mt-4">
          <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
            Способ оплаты
          </label>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPaymentMethod('stars');
              }}
              className={`p-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                paymentMethod === 'stars'
                  ? 'bg-white/10 border-white/20 text-white font-semibold'
                  : 'bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:text-white'
              }`}
            >
              <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Telegram Stars ({selectedPackage.price_stars})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPaymentMethod('crypto');
              }}
              className={`p-2.5 rounded-2xl border flex items-center justify-center gap-2 text-xs font-medium transition-all ${
                paymentMethod === 'crypto'
                  ? 'bg-white/10 border-white/20 text-white font-semibold'
                  : 'bg-white/[0.02] border-white/[0.06] text-neutral-400 hover:text-white'
              }`}
            >
              <Bot className="w-4 h-4 text-neutral-300" />
              <span>CryptoBot (${selectedPackage.price_usd})</span>
            </button>
          </div>
        </div>

        {/* Info Box about Rates */}
        <div className="mt-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-[11px] text-neutral-300 leading-relaxed flex items-start gap-2">
          <Info className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white">Правила списания BLX токенов:</p>
            <p className="mt-0.5 text-neutral-400">
              • <strong className="text-white">Start</strong>: 1 токен = 1 отправленное сообщение.
            </p>
            <p className="text-neutral-400">
              • <strong className="text-white">Pro</strong>: 1 токен = 2 сообщения! Вдвое больше рассылок.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs text-center text-neutral-200">
            {statusMessage}
          </div>
        )}

        {/* Pay / Open Crypto Link */}
        <div className="mt-4">
          {cryptoUrl ? (
            <a
              href={cryptoUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => triggerHaptic('medium')}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>Оплатить в CryptoBot (${selectedPackage.price_usd} USDT)</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleBuy}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isProcessing
                  ? 'bg-neutral-800 text-neutral-500 cursor-wait'
                  : 'bg-white hover:bg-neutral-200 text-black'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Формирование счёта...</span>
                </>
              ) : (
                <>
                  <span>
                    Купить {selectedPackage.tokens.toLocaleString('ru-RU')} BLX за{' '}
                    {paymentMethod === 'stars'
                      ? `${selectedPackage.price_stars} Stars`
                      : `$${selectedPackage.price_usd} USDT`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
