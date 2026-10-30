import React, { useState } from 'react';
import { X, Smartphone, KeyRound, Lock, ArrowRight, RefreshCw, Send, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { botApi } from '../services/api';
import { AccountItem } from '../types';

interface AddAccountModalProps {
  userId: number;
  initialMode?: 'phone' | 'session';
  onClose: () => void;
  onSuccess: (acc: AccountItem) => void;
}

type Step = 'phone' | 'code' | '2fa' | 'session' | 'success';

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  userId,
  initialMode = 'phone',
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>(initialMode === 'session' ? 'session' : 'phone');
  const [phone, setPhone] = useState('+7');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sessionString, setSessionString] = useState('');
  const [phoneHash, setPhoneHash] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAccount, setCreatedAccount] = useState<AccountItem | null>(null);

  // Step 1: Send Code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      setError('Введите корректный номер телефона с кодом страны');
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
        setError(res.error || 'Ошибка отправки кода в Telegram. Проверьте номер.');
        triggerHaptic('error');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Ошибка сети');
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

  // Step 3: Confirm 2FA
  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Введите облачный пароль 2FA');
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
        onSuccess(res.account);
      } else {
        setError(res.error || 'Неверный пароль двухэтапной аутентификации.');
        triggerHaptic('error');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Ошибка проверки 2FA');
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Session string import
  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionString.trim()) {
      setError('Вставьте строку StringSession');
      return;
    }
    setError(null);
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      const res = await botApi.addAccountBySession(userId, sessionString);
      if (res.ok && res.account) {
        setCreatedAccount(res.account);
        setStep('success');
        triggerHaptic('success');
        onSuccess(res.account);
      } else {
        setError(res.error || 'Невалидная строка сессии');
        triggerHaptic('error');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Ошибка импорта сессии');
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="apple-glass-card rounded-3xl max-w-sm w-full p-6 relative shadow-2xl border-white/20">
        {/* Close Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full apple-glass-button flex items-center justify-center text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            {step === 'session' ? <FileCode className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {step === 'phone' && 'Шаг 1: Номер телефона'}
              {step === 'code' && 'Шаг 2: Код подтверждения'}
              {step === '2fa' && 'Шаг 3: 2FA Пароль'}
              {step === 'session' && 'Импорт по StringSession'}
              {step === 'success' && 'Аккаунт добавлен!'}
            </h3>
            <p className="text-xs text-slate-400">
              {step === 'phone' && 'Вход в Telegram через Telethon'}
              {step === 'code' && `Отправлен на номер ${phone}`}
              {step === '2fa' && 'Облачный пароль аккаунта'}
              {step === 'session' && 'Быстрое добавление готовой сессии'}
              {step === 'success' && 'Готов к рассылкам в боте'}
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: PHONE */}
        {step === 'phone' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Номер телефона с кодом страны:
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 999 123-45-67"
                  className="w-full px-4 py-3 rounded-2xl apple-glass-input text-white text-sm outline-none font-mono"
                  autoFocus
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Код авторизации придёт в официальное приложение Telegram.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Отправка кода...</span>
                </>
              ) : (
                <>
                  <span>Получить код</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep('session')}
                className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-4"
              >
                Есть StringSession? Войти по session
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: CODE */}
        {step === 'code' && (
          <form onSubmit={handleConfirmCode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Код из Telegram:
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="12345"
                className="w-full px-4 py-3 rounded-2xl apple-glass-input text-white text-center text-lg tracking-widest font-mono outline-none"
                autoFocus
                maxLength={8}
                required
              />
              <p className="text-[11px] text-slate-400 text-center">
                Проверьте входящие системные сообщения Telegram
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Проверка кода...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Подтвердить вход</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-slate-400 hover:text-white"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  alert('Запрос на повторную отправку по SMS отправлен');
                }}
                className="text-blue-400 hover:text-blue-300"
              >
                Отправить через SMS
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: 2FA PASSWORD */}
        {step === '2fa' && (
          <form onSubmit={handleConfirm2FA} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Облачный пароль (2FA):
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ваш пароль 2FA"
                className="w-full px-4 py-3 rounded-2xl apple-glass-input text-white text-sm outline-none"
                autoFocus
                required
              />
              <p className="text-[11px] text-slate-400">
                На этом аккаунте включена двухэтапная аутентификация
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Проверка пароля...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Войти в аккаунт</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* SESSION STRING IMPORT */}
        {step === 'session' && (
          <form onSubmit={handleAddSession} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                StringSession (Telethon):
              </label>
              <textarea
                value={sessionString}
                onChange={(e) => setSessionString(e.target.value)}
                placeholder="1BJWap1wBu8v..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-2xl apple-glass-input text-white text-xs font-mono outline-none resize-none"
                required
              />
              <p className="text-[11px] text-slate-400">
                Вставьте готовую сессию Telethon StringSession
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 hover:brightness-110 active:scale-95 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Импорт сессии...</span>
                </>
              ) : (
                <>
                  <FileCode className="w-4 h-4" />
                  <span>Импортировать сессию</span>
                </>
              )}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                ← Вернуться ко входу по номеру
              </button>
            </div>
          </form>
        )}

        {/* SUCCESS */}
        {step === 'success' && createdAccount && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Аккаунт подключен!</h4>
              <p className="text-sm font-mono text-blue-300 font-semibold mt-1">
                {createdAccount.phone}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Аккаунт сохранен и синхронизирован с Telegram ботом. Теперь вы можете использовать его в рассылках.
              </p>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
            >
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
