import React, { useState } from 'react';
import { X, Smartphone, FileCode, Check, QrCode, Shield, Server, ArrowLeft } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { botApi } from '../services/api';
import { AccountItem } from '../types';

interface AddAccountModalProps {
  userId: number;
  initialMode?: 'select' | 'phone' | 'session';
  onClose: () => void;
  onSuccess: (acc: AccountItem) => void;
}

type Step = 'select' | 'phone' | 'code' | '2fa' | 'session' | 'qr_info' | 'proxy_info' | 'success';

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  userId,
  initialMode = 'select',
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>(
    initialMode === 'session' ? 'session' : initialMode === 'phone' ? 'phone' : 'select'
  );
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 relative shadow-2xl space-y-4">
        {/* Top close button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── STEP: SELECT METHOD (Exact match to screenshot) ── */}
        {step === 'select' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 text-white font-semibold text-base">
              <span>👤</span>
              <span>Добавить профиль</span>
            </div>

            {/* Disclaimer box as seen in user screenshot */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-200 leading-relaxed flex items-start gap-2.5">
              <span className="text-base flex-shrink-0">🔒</span>
              <div>
                Аккаунт используется <strong className="text-white">ТОЛЬКО</strong> для авторассылки. Личная переписка не читается и не сохраняется.
              </div>
            </div>

            <div className="text-xs text-neutral-400 font-medium">
              Выберите способ входа:
            </div>

            {/* Colored Buttons matching screenshot */}
            <div className="space-y-2.5">
              {/* Green Success button: По SMS-коду */}
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setStep('phone');
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.98]"
              >
                <span>📲</span>
                <span>По SMS-коду</span>
              </button>

              {/* Blue Primary button: По QR-коду */}
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setStep('session');
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
              >
                <span>📁</span>
                <span>По StringSession / QR-коду</span>
              </button>

              {/* Blue Primary button: Прокси / API */}
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setStep('proxy_info');
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]"
              >
                <span>🤝</span>
                <span>Прокси / API</span>
              </button>

              {/* Red Danger button: Закрыть */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-700/20 active:scale-[0.98]"
              >
                <span>Закрыть</span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: PROXY / API INFO ── */}
        {step === 'proxy_info' && (
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep('select')}
                className="p-1.5 -ml-1 text-neutral-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="text-sm font-semibold text-white">Прокси и параметры API</h3>
            </div>

            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3.5 space-y-2 text-xs text-neutral-300">
              <p>
                Бот подключается напрямую к официальным шлюзам MTProto Telegram через защищённый протокол Abridged.
              </p>
              <p className="text-neutral-400">
                • Ротация аккаунтов происходит на сервере бота без внешних задержек.<br />
                • Вы можете использовать StringSession, созданный с любым прокси (SOCKS5/HTTP).
              </p>
            </div>

            <button
              onClick={() => setStep('select')}
              className="w-full py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium"
            >
              Вернуться назад
            </button>
          </div>
        )}

        {/* Header for phone/code/session/success steps */}
        {step !== 'select' && step !== 'proxy_info' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep('select')}
              className="p-1.5 -ml-1 text-neutral-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
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
        )}

        {/* Error message */}
        {error && (
          <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* STEP 1: PHONE */}
        {step === 'phone' && (
          <form onSubmit={handleSendCode} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Номер телефона:</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 999 123-45-67"
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs outline-none font-mono focus:border-neutral-700"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {isLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{isLoading ? 'Отправка запроса...' : 'Получить код'}</span>
            </button>
          </form>
        )}

        {/* STEP 2: CODE */}
        {step === 'code' && (
          <form onSubmit={handleConfirmCode} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Код из Telegram:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="1 2 3 4 5"
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-sm font-mono tracking-widest text-center outline-none focus:border-neutral-700"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {isLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{isLoading ? 'Проверка...' : 'Войти'}</span>
            </button>
          </form>
        )}

        {/* STEP 3: 2FA */}
        {step === '2fa' && (
          <form onSubmit={handleConfirm2FA} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Облачный пароль (2FA):</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Пароль двухэтапной аутентификации"
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs outline-none focus:border-neutral-700"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {isLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{isLoading ? 'Проверка...' : 'Подтвердить 2FA'}</span>
            </button>
          </form>
        )}

        {/* STEP: SESSION IMPORT */}
        {step === 'session' && (
          <form onSubmit={handleAddSession} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">StringSession (Telethon):</label>
              <textarea
                value={sessionString}
                onChange={(e) => setSessionString(e.target.value)}
                placeholder="1BVtsOGQBu..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono outline-none focus:border-neutral-700 resize-none"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
            >
              {isLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{isLoading ? 'Проверка сессии...' : 'Импортировать'}</span>
            </button>
          </form>
        )}

        {/* STEP: SUCCESS */}
        {step === 'success' && createdAccount && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Аккаунт подключен!</div>
              <div className="text-xs text-neutral-400 font-mono mt-0.5">{createdAccount.phone}</div>
            </div>
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-full py-3 rounded-xl bg-white text-black text-xs font-medium hover:bg-neutral-200 transition-colors"
            >
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
