import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { X, Clock, MessageSquareQuote, Lock, Sparkles, Check, ChevronRight } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface CreateTaskModalProps {
  user: UserProfile;
  accounts: AccountItem[];
  onClose: () => void;
  onCreate: (task: Partial<TaskItem>) => Promise<void>;
  onOpenSubscriptions?: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  user,
  accounts,
  onClose,
  onCreate,
  onOpenSubscriptions,
}) => {
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;
  const isProOrPrem = user.sub_plan === 'pro' || user.sub_plan === 'premium';

  const [text, setText] = useState('');
  const [linksText, setLinksText] = useState('');
  
  // Delay presets
  const [delayPreset, setDelayPreset] = useState<'default' | 'fast' | 'safe' | 'custom'>('default');
  const [delayMin, setDelayMin] = useState<number>(Math.max(10, plan.min_delay));
  const [delayMax, setDelayMax] = useState<number>(Math.max(30, plan.min_delay + 15));
  
  const [isLoop, setIsLoop] = useState(false);
  const [targetAccs, setTargetAccs] = useState('all');

  // Auto-responder feature (Pro & Premium+)
  const [autoReply, setAutoReply] = useState(false);
  const [autoReplyText, setAutoReplyText] = useState('');
  const [showAutoReplyUpgradePrompt, setShowAutoReplyUpgradePrompt] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply Delay Preset
  const handleSelectPreset = (preset: 'default' | 'fast' | 'safe' | 'custom') => {
    setDelayPreset(preset);
    triggerHaptic('light');

    if (preset === 'default') {
      const dMin = Math.max(10, plan.min_delay);
      setDelayMin(dMin);
      setDelayMax(Math.max(30, dMin + 15));
    } else if (preset === 'fast') {
      if (!isProOrPrem) {
        // Fast requires pro
        const dMin = Math.max(10, plan.min_delay);
        setDelayMin(dMin);
        setDelayMax(dMin + 10);
      } else {
        setDelayMin(5);
        setDelayMax(15);
      }
    } else if (preset === 'safe') {
      setDelayMin(25);
      setDelayMax(50);
    }
  };

  const handleToggleAutoReply = () => {
    if (!isProOrPrem) {
      triggerHaptic('warning');
      setShowAutoReplyUpgradePrompt(true);
      return;
    }
    triggerHaptic('light');
    setAutoReply(prev => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      setError('Введите рекламный текст для рассылки');
      triggerHaptic('error');
      return;
    }

    const lines = linksText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setError('Укажите хотя бы одного получателя (по одной ссылке на строке)');
      triggerHaptic('error');
      return;
    }

    // Delay validations with fallback
    let validMin = Number(delayMin);
    let validMax = Number(delayMax);

    if (isNaN(validMin) || validMin < 1) validMin = plan.min_delay;
    if (isNaN(validMax) || validMax < validMin) validMax = validMin + 15;

    if (validMin < plan.min_delay) {
      setError(`Минимальная задержка для тарифа ${plan.name}: ${plan.min_delay} сек.`);
      triggerHaptic('error');
      return;
    }

    setError(null);
    setIsLoading(true);
    triggerHaptic('medium');

    const parsedChats = lines.map((link, idx) => {
      const clean = link.replace('https://t.me/', '').replace('t.me/', '').replace('@', '');
      const isNum = /^-?\d+$/.test(clean);
      return {
        id: idx + 1,
        chat_id: isNum ? parseInt(clean) : 0,
        username: isNum ? '' : clean,
        title: clean,
        status: 'pending' as const
      };
    });

    try {
      await onCreate({
        user_id: user.user_id,
        text: text.trim(),
        target_accs: targetAccs,
        delay_min: validMin,
        delay_max: validMax,
        loop: isLoop ? 1 : 0,
        media: null,
        chats: parsedChats,
        auto_reply: autoReply ? 1 : 0,
        auto_reply_text: autoReplyText.trim() || undefined,
        auto_reply_mode: 'reply_latest'
      });
      triggerHaptic('success');
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Ошибка создания задачи');
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xl animate-fade-in p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-[#14151a]/95 border-t sm:border border-white/[0.12] rounded-t-[28px] sm:rounded-[28px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden apple-liquid-sheet">
        
        {/* iOS Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.08] flex-shrink-0">
          <div>
            <h3 className="text-[17px] font-semibold text-white tracking-tight">Новая кампания</h3>
            <p className="text-[12px] text-neutral-400">Настройка параметров авторассылки</p>
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

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          
          {/* Text Area */}
          <div className="apple-group-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-white">
                Текст рекламного сообщения
              </label>
              <span className="text-[11px] text-neutral-400 font-mono">
                {text.length} симв.
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введите текст сообщения для рассылки..."
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-[13px] outline-none resize-none leading-relaxed focus:border-white/20 transition-all placeholder:text-neutral-500"
            />
          </div>

          {/* Links Area */}
          <div className="apple-group-card p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-white">
                Список получателей / чатов
              </label>
              <span className="text-[11px] text-neutral-400 font-mono">
                @username или t.me/link
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              placeholder={`@chat_one\nhttps://t.me/channel_two\n@group_three`}
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-[13px] outline-none font-mono resize-none leading-relaxed focus:border-white/20 transition-all placeholder:text-neutral-500"
            />
          </div>

          {/* Delays Section (Fixed & Apple Segmented Presets) */}
          <div className="apple-group-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-[13px] font-medium text-white">Интервал задержки</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                мин. для тарифа: {plan.min_delay}с
              </span>
            </div>

            {/* Apple Segmented Delay Presets */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/40 border border-white/[0.08] rounded-xl text-xs">
              <button
                type="button"
                onClick={() => handleSelectPreset('default')}
                className={`py-1.5 px-1 rounded-lg font-medium transition-all text-center ${
                  delayPreset === 'default'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Дефолт
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('fast')}
                className={`py-1.5 px-1 rounded-lg font-medium transition-all text-center ${
                  delayPreset === 'fast'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Быстрая
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('safe')}
                className={`py-1.5 px-1 rounded-lg font-medium transition-all text-center ${
                  delayPreset === 'safe'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Безопасная
              </button>
              <button
                type="button"
                onClick={() => setDelayPreset('custom')}
                className={`py-1.5 px-1 rounded-lg font-medium transition-all text-center ${
                  delayPreset === 'custom'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Своя
              </button>
            </div>

            {/* Delay Inputs */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2">
                <span className="text-[10px] text-neutral-400 block font-medium">От (секунд)</span>
                <input
                  type="number"
                  value={delayMin}
                  onChange={(e) => {
                    setDelayPreset('custom');
                    setDelayMin(Number(e.target.value));
                  }}
                  className="w-full bg-transparent text-white font-mono text-[14px] outline-none mt-0.5"
                />
              </div>
              <div className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2">
                <span className="text-[10px] text-neutral-400 block font-medium">До (секунд)</span>
                <input
                  type="number"
                  value={delayMax}
                  onChange={(e) => {
                    setDelayPreset('custom');
                    setDelayMax(Number(e.target.value));
                  }}
                  className="w-full bg-transparent text-white font-mono text-[14px] outline-none mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Auto-responder in chats (Exclusive for Pro & Premium+) */}
          <div className="apple-group-card p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-white">Автоответчик в чатах</span>
                    {!isProOrPrem && (
                      <span className="text-[9px] font-bold text-amber-300 bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.2 rounded-full uppercase flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> PRO+
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Отвечать на последнее сообщение в чате
                  </div>
                </div>
              </div>

              {/* Cupertino Toggle */}
              <button
                type="button"
                onClick={handleToggleAutoReply}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                  autoReply && isProOrPrem ? 'bg-purple-600' : 'bg-neutral-700/80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 flex items-center justify-center ${
                    autoReply && isProOrPrem ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {!isProOrPrem && <Lock className="w-3 h-3 text-neutral-600" />}
                </div>
              </button>
            </div>

            {/* Upgrade prompt for Free users */}
            {showAutoReplyUpgradePrompt && !isProOrPrem && (
              <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/25 space-y-2 text-xs">
                <div className="text-amber-200 font-medium">
                  🔒 Функция автоответчика доступна на тарифах Pro и Premium+
                </div>
                <p className="text-[11px] text-neutral-300">
                  Бот находит свежие входящие сообщения в чатах и отвечает прямо на них, вызывая push-уведомление автору!
                </p>
                {onOpenSubscriptions && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onClose();
                      onOpenSubscriptions();
                    }}
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Сменить тариф на Pro
                  </button>
                )}
              </div>
            )}

            {/* Custom reply text field if auto-reply is active */}
            {autoReply && isProOrPrem && (
              <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 text-[12px]">Текст ответа (или оставьте пустым для основного текста):</span>
                </div>
                <input
                  type="text"
                  value={autoReplyText}
                  onChange={(e) => setAutoReplyText(e.target.value)}
                  placeholder="Привет! Насчёт вашего сообщения..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-white text-xs outline-none focus:border-white/20"
                />
              </div>
            )}
          </div>

          {/* Accounts selection & Loop */}
          <div className="apple-group-card divide-y divide-white/[0.06]">
            {/* Accounts dropdown */}
            <div className="p-3.5 flex items-center justify-between gap-3">
              <label className="text-[13px] font-medium text-white flex-shrink-0">
                Аккаунты:
              </label>
              <select
                value={targetAccs}
                onChange={(e) => setTargetAccs(e.target.value)}
                className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-white/20 max-w-[200px]"
              >
                <option value="all" className="bg-[#1c1d24] text-white">
                  Все мои аккаунты ({accounts.length})
                </option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={String(acc.id)} className="bg-[#1c1d24] text-white">
                    {acc.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Loop Toggle */}
            <div className="p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium text-white">Бесконечный автоповтор (Loop)</div>
                <div className="text-[11px] text-neutral-400">Повторять рассылку по кругу с задержкой</div>
              </div>

              {/* Cupertino Toggle */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsLoop(prev => !prev);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                  isLoop ? 'bg-blue-600' : 'bg-neutral-700/80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    isLoop ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Submit Actions */}
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
              disabled={isLoading}
              className="flex-1 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[14px] transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Создание...' : 'Запустить кампанию'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
