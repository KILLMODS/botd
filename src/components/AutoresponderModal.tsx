import React, { useState } from 'react';
import { UserProfile, AutoResponderConfig } from '../types';
import { botApi } from '../services/api';
import { X, MessageSquareQuote, Moon, Check, Sparkles, Shield, Info, Clock, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface AutoresponderModalProps {
  user: UserProfile;
  onClose: () => void;
  onUpdateUser: (updatedUser: UserProfile) => void;
}

export const AutoresponderModal: React.FC<AutoresponderModalProps> = ({
  user,
  onClose,
  onUpdateUser,
}) => {
  const currentConfig: AutoResponderConfig = user.auto_responder || {
    enabled: true,
    text: 'Здравствуйте! Сейчас я не в сети. Отвечу на ваше сообщение, как только освобожусь.',
    trigger: 'offline_only',
    delay_seconds: 2,
    total_replies_sent: 0,
  };

  const [enabled, setEnabled] = useState(currentConfig.enabled);
  const [text, setText] = useState(currentConfig.text);
  const [trigger, setTrigger] = useState<'offline_only' | 'first_message_always'>(currentConfig.trigger);
  const [delaySeconds, setDelaySeconds] = useState(currentConfig.delay_seconds || 2);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    setIsSaving(true);
    try {
      const newConfig: AutoResponderConfig = {
        enabled,
        text: text.trim(),
        trigger,
        delay_seconds: Math.max(1, Number(delaySeconds)),
        total_replies_sent: currentConfig.total_replies_sent || 0,
      };
      const updatedUser = await botApi.saveAutoResponder(user.user_id, newConfig);
      onUpdateUser(updatedUser);
      setSavedSuccess(true);
      triggerHaptic('success');
      setTimeout(() => {
        onClose();
      }, 700);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xl animate-fade-in p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-[#14151a]/95 border-t sm:border border-white/[0.12] rounded-t-[28px] sm:rounded-[28px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden apple-liquid-sheet">
        
        {/* iOS Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <MessageSquareQuote className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-white tracking-tight">Автоответчик в ЛС</h3>
              <p className="text-[12px] text-neutral-400">Доступен на всех тарифах (включая Free)</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          
          {/* Main Switch Card */}
          <div className="apple-group-card p-4 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-semibold text-white flex items-center gap-2">
                <span>Автоответ на личные сообщения</span>
                <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase border border-emerald-500/30">
                  Все тарифы
                </span>
              </div>
              <div className="text-[12px] text-neutral-400 mt-0.5">
                Автоматически отвечать собеседнику в личной переписке
              </div>
            </div>

            {/* iOS Switch */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setEnabled(!enabled);
              }}
              className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                enabled ? 'bg-purple-600' : 'bg-neutral-700/80'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Important Rule: Counts as 1 message */}
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-200">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white">Учёт сообщений:</span>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Каждый отправленный автоответчиком ответ засчитывается как <strong>1 сообщение</strong> в ваш суточный лимит рассылки.
              </p>
            </div>
          </div>

          {/* Trigger Condition Selector */}
          <div className="apple-group-card p-4 space-y-3">
            <label className="text-[13px] font-medium text-white block">
              Когда отправлять автоответ?
            </label>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setTrigger('offline_only');
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  trigger === 'offline_only'
                    ? 'bg-purple-600/20 border-purple-500/40 text-white'
                    : 'bg-black/30 border-white/[0.06] text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Moon className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="text-[13px] font-medium text-white">Только когда не в сети (Оффлайн)</div>
                    <div className="text-[11px] text-neutral-400">
                      Отвечает только если ваш аккаунт находится не в сети
                    </div>
                  </div>
                </div>
                {trigger === 'offline_only' && <Check className="w-4 h-4 text-purple-400" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setTrigger('first_message_always');
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  trigger === 'first_message_always'
                    ? 'bg-purple-600/20 border-purple-500/40 text-white'
                    : 'bg-black/30 border-white/[0.06] text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-[13px] font-medium text-white">Всегда на первое сообщение</div>
                    <div className="text-[11px] text-neutral-400">
                      Отвечает при первом входящем сообщении от нового пользователя
                    </div>
                  </div>
                </div>
                {trigger === 'first_message_always' && <Check className="w-4 h-4 text-purple-400" />}
              </button>
            </div>
          </div>

          {/* Text Template */}
          <div className="apple-group-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-white">
                Текст автоответа
              </label>
              <span className="text-[11px] text-neutral-400 font-mono">
                {text.length} симв.
              </span>
            </div>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Здравствуйте! Сейчас я не в сети..."
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-[13px] outline-none resize-none leading-relaxed focus:border-purple-500/40 transition-all placeholder:text-neutral-500"
            />
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-neutral-400">Быстрые шаблоны:</span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setText('Здравствуйте! Сейчас я не в сети, напишу вам, как только буду онлайн.');
                }}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 text-[10px]"
              >
                Оффлайн
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setText('Привет! Спасибо за сообщение, я обязательно ознакомлюсь и отвечу.');
                }}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 text-[10px]"
              >
                Приветствие
              </button>
            </div>
          </div>

          {/* Delay */}
          <div className="apple-group-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-[13px] font-medium text-white block">Имитация набора (Задержка)</span>
                <span className="text-[11px] text-neutral-400">Естественная пауза перед отправкой</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={30}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-14 px-2 py-1 text-center rounded-lg bg-black/40 border border-white/[0.08] text-white text-xs font-mono outline-none"
              />
              <span className="text-xs text-neutral-400">сек.</span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 pb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-neutral-300 font-semibold text-[14px] transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 px-5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[14px] transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isSaving ? 'Сохранение...' : savedSuccess ? 'Сохранено ✓' : 'Сохранить настройки'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
