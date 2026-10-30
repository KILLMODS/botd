import React, { useState } from 'react';
import { X, Smartphone, FileCode, Check } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-sm w-full p-5 relative shadow-xl">
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
            {step === 'session' ? <FileCode className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {step === 'phone' && 'Номер телефона'}
              {step === 'code' && 'Код подтверждения'}
              {step === '2fa' && 'Пароль 2FA'}
              {step === 'session' && 'Импорт session'}
              {step === 'success' && 'Аккаунт добавлен'}
            </h3>
            <p className="text-[11px] text-neutral-400 font-mono">
              {step === 'phone' && 'Авторизация в Telegram'}
              {step === 'code' && `Отправлен на ${phone}`}
              {step === '2fa' && 'Двухэтапная аутентификация'}
              {step === 'session' && 'Telethon StringSession'}
              {step === 'success' && 'Синхронизирован с ботом'}
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        {/* STEP 1: PHONE */}
        {step === 'phone' && (
          <form onSubmit={handleSendCode} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">
                Номер телефона:
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 999 123-45-67"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs outline-none font-mono focus:border-neutral-700"
                autoFocus
                required
              />
              <p className="text-[11px] text-neutral-500">
                Код придет в диалог Telegram.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-medium text-xs transition-colors"
            >
              {isLoading ? 'Отправка...' : 'Получить код'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setStep('session')}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Войти по готовой StringSession
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: CODE */}
        {step === 'code' && (
          <form onSubmit={handleConfirmCode} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">
                Код из Telegram:
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="12345"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-center text-base tracking-widest font-mono outline-none focus:border-neutral-700"
                autoFocus
                maxLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-medium text-xs transition-colors"
            >
              {isLoading ? 'Проверка...' : 'Подтвердить код'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-xs text-neutral-400 hover:text-white"
              >
                ← Изменить номер
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: 2FA */}
        {step === '2fa' && (
          <form onSubmit={handleConfirm2FA} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">
                Пароль 2FA:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ваш облачный пароль"
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs outline-none focus:border-neutral-700"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-medium text-xs transition-colors"
            >
              {isLoading ? 'Проверка...' : 'Войти'}
            </button>
          </form>
        )}

        {/* SESSION IMPORT */}
        {step === 'session' && (
          <form onSubmit={handleAddSession} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">
                StringSession:
              </label>
              <textarea
                value={sessionString}
                onChange={(e) => setSessionString(e.target.value)}
                placeholder="1BJWap1wBu8v..."
                rows={4}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono outline-none resize-none focus:border-neutral-700"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-medium text-xs transition-colors"
            >
              {isLoading ? 'Импорт...' : 'Импортировать'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-xs text-neutral-400 hover:text-white"
              >
                ← Вернуться ко входу по номеру
              </button>
            </div>
          </form>
        )}

        {/* SUCCESS */}
        {step === 'success' && createdAccount && (
          <div className="text-center space-y-3 py-2">
            <div className="w-10 h-10 rounded-full bg-neutral-800 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">Аккаунт подключен</h4>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">
                {createdAccount.phone}
              </p>
            </div>

            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-medium text-xs transition-colors"
            >
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
