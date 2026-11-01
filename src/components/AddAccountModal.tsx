import React, { useState, useEffect, useRef } from 'react';
import { X, Smartphone, ArrowRight, Shield, Check, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { botApi } from '../services/api';
import { AccountItem } from '../types';
import confetti from 'canvas-confetti';

interface AddAccountModalProps {
  userId: number;
  initialMode?: 'select' | 'phone' | 'session';
  onClose: () => void;
  onSuccess: (acc: AccountItem) => void;
}

type Step = 'phone' | 'code' | '2fa' | 'success';

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  userId,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+7');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [phoneHash, setPhoneHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<AccountItem | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'phone') {
      setTimeout(() => phoneInputRef.current?.focus(), 150);
    } else if (step === 'code') {
      setTimeout(() => codeInputRef.current?.focus(), 150);
    }
  }, [step]);

  // Step 1: Send Code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError('Введите полный номер телефона с кодом страны (например, +79991234567)');
      return;
    }
    setError(null);
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      const res = await botApi.authSendCode(userId, cleanPhone);
      if (res.ok) {
        setPhoneHash(res.phone_hash || '');
        setStep('code');
        triggerHaptic('success');
      } else {
        setError(res.error || 'Ошибка отправки кода в Telegram. Проверьте правильность номера.');
        triggerHaptic('error');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Ошибка сети при обращении к серверу');
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm Code
  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\D/g, '');
    if (!cleanCode) {
      setError('Введите код подтверждения из Telegram');
      return;
    }
    setError(null);
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      const res = await botApi.authConfirmCode(userId, phone, cleanCode, phoneHash);
      if (res.ok) {
        if (res.need_2fa) {
          setStep('2fa');
          triggerHaptic('warning');
        } else if (res.account) {
          setCreatedAccount(res.account);
          setStep('success');
          triggerHaptic('success');
          confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
          onSuccess(res.account);
        }
      } else {
        setError(res.error || 'Неверный или просроченный код. Попробуйте снова.');
        triggerHaptic('error');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Ошибка подтверждения');
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: 2FA Password
  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Введите облачный пароль (двухфакторная аутентификация)');
      return;
    }
    setError(null);
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      const res = await botApi.authConfirm2FA(userId, phone, password);
      if (res.ok && res.account) {
        setCreatedAccount(res.account);
        setStep('success');
        triggerHaptic('success');
        confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
        onSuccess(res.account);
      } else {
        setError(res.error || 'Неверный двухфакторный пароль. Попробуйте ещё раз.');
        triggerHaptic('error');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Ошибка 2FA');
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#14151e]/98 border-t border-x border-white/[0.18] rounded-t-[32px] p-5 sm:p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.25)] flex flex-col max-h-[90vh] overflow-y-auto relative text-white animate-slide-up"
      >
        {/* Grab Handle */}
        <div className="w-12 h-1.5 rounded-full bg-white/25 mx-auto mb-3" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Подключение аккаунта</h3>
              <p className="text-[11px] text-neutral-400">
                {step === 'phone' && 'Введите номер телефона для получения кода в Telegram'}
                {step === 'code' && `Код отправлен на ${phone}`}
                {step === '2fa' && 'Требуется двухфакторная аутентификация'}
                {step === 'success' && 'Аккаунт успешно авторизован!'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/[0.07] hover:bg-white/[0.15] border border-white/[0.1] flex items-center justify-center text-neutral-400 hover:text-white transition-all active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-xs text-red-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Step: Phone Input */}
        {step === 'phone' && (
          <form onSubmit={handleSendCode} className="mt-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5 px-1">
                Номер телефона
              </label>
              <div className="relative">
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full bg-[#1c1d27] border border-white/[0.14] rounded-2xl px-4 py-3.5 text-base font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50 transition-all shadow-inner"
                  required
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-2 px-1 leading-relaxed">
                Код подтверждения придёт в официальное приложение Telegram на ваших устройствах.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
                isLoading
                  ? 'bg-neutral-700 text-neutral-400 cursor-wait'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Отправка запроса в Telegram...</span>
                </>
              ) : (
                <>
                  <span>Получить код</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step: Code Confirmation */}
        {step === 'code' && (
          <form onSubmit={handleConfirmCode} className="mt-4 space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider block mb-1.5 px-1">
                Код подтверждения Telegram
              </label>
              <input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="12345"
                className="w-full bg-[#1c1d27] border border-white/[0.14] rounded-2xl px-4 py-3.5 text-center text-2xl font-mono tracking-[0.3em] text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-400 transition-all"
                required
              />
              <p className="text-[11px] text-neutral-400 mt-2 text-center">
                Проверьте входящие сообщения от служебного аккаунта Telegram
              </p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setStep('phone');
                  setError(null);
                }}
                className="w-1/3 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-neutral-300 transition-all"
              >
                Назад
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Проверка...</span>
                  </>
                ) : (
                  <span>Подтвердить вход</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step: 2FA Password */}
        {step === '2fa' && (
          <form onSubmit={handleConfirm2FA} className="mt-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <label className="text-[11px] font-semibold text-neutral-300 uppercase tracking-wider">
                  Двухфакторный пароль (2FA)
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ваш облачный пароль"
                className="w-full bg-[#1c1d27] border border-white/[0.14] rounded-2xl px-4 py-3.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400 transition-all"
                required
              />
              <p className="text-[11px] text-neutral-400 mt-2 px-1">
                На этом номере включена дополнительная защита Telegram (Cloud Password).
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Вход...</span>
                </>
              ) : (
                <span>Войти с 2FA</span>
              )}
            </button>
          </form>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="mt-4 py-4 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mx-auto text-emerald-400">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white">Аккаунт успешно подключен!</h4>
            <p className="text-xs text-neutral-300">
              {createdAccount?.phone || phone} теперь готов для отправки рассылок.
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
            >
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
