import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { X, Send, RotateCw, Clock, Users, Image as ImageIcon, Plus } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface CreateTaskModalProps {
  user: UserProfile;
  accounts: AccountItem[];
  onClose: () => void;
  onCreate: (task: Partial<TaskItem>) => Promise<void>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  user,
  accounts,
  onClose,
  onCreate,
}) => {
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;

  const [text, setText] = useState('');
  const [linksText, setLinksText] = useState('');
  const [delayMin, setDelayMin] = useState(plan.min_delay);
  const [delayMax, setDelayMax] = useState(plan.min_delay + 15);
  const [isLoop, setIsLoop] = useState(false);
  const [hasMedia, setHasMedia] = useState(false);
  const [targetAccs, setTargetAccs] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError('Введите текст рассылки');
      return;
    }

    const lines = linksText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setError('Укажите хотя бы один чат, группу или канал (каждый с новой строки)');
      return;
    }

    if (delayMin < plan.min_delay) {
      setError(`Минимальная задержка для вашего тарифа (${plan.name}) составляет ${plan.min_delay} сек.`);
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
        delay_min: delayMin,
        delay_max: Math.max(delayMin, delayMax),
        loop: isLoop ? 1 : 0,
        media: hasMedia ? 'photo_attachment.jpg' : null,
        chats: parsedChats,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="apple-glass-card rounded-3xl max-w-md w-full p-5 sm:p-6 relative shadow-2xl border-white/20 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Plus className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Новая задача рассылки</h3>
              <p className="text-xs text-slate-400">Синхронизируется с ботом</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full apple-glass-button flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 py-3 overflow-y-auto pr-1">
          {/* Message Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Текст сообщения:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Здравствуйте! Предлагаем вашему вниманию..."
              className="w-full px-3 py-2.5 rounded-2xl apple-glass-input text-white text-xs outline-none resize-none leading-relaxed"
              required
            />
          </div>

          {/* Media Checkbox */}
          <div
            onClick={() => {
              triggerHaptic('selection');
              setHasMedia(!hasMedia);
            }}
            className="apple-glass rounded-2xl p-3 flex items-center justify-between cursor-pointer border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ImageIcon className={`w-4 h-4 ${hasMedia ? 'text-purple-400' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-semibold text-white">Прикрепить медиа (фото)</div>
                <div className="text-[11px] text-slate-400">Отправка фото с подписью</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hasMedia}
              onChange={() => {}}
              className="w-4 h-4 rounded text-blue-500"
            />
          </div>

          {/* Recipients / Chats */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Список получателей (по одному на строку):
            </label>
            <textarea
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              rows={3}
              placeholder={'@channel_one\nhttps://t.me/crypto_chat\n@tg_promogroup'}
              className="w-full px-3 py-2.5 rounded-2xl apple-glass-input text-white text-xs font-mono outline-none resize-none"
              required
            />
            <p className="text-[10px] text-slate-400">
              Поддерживаются ссылки вида: @username, https://t.me/chat, или числовые ID.
            </p>
          </div>

          {/* Delay Range */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Интервал задержки (мин – макс):
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {delayMin} – {delayMax} сек
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="apple-glass rounded-2xl p-2 border-white/10">
                <span className="text-[10px] text-slate-400 block mb-1">Мин (сек):</span>
                <input
                  type="number"
                  min={plan.min_delay}
                  max={300}
                  value={delayMin}
                  onChange={(e) => setDelayMin(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-xs outline-none"
                />
              </div>
              <div className="apple-glass rounded-2xl p-2 border-white/10">
                <span className="text-[10px] text-slate-400 block mb-1">Макс (сек):</span>
                <input
                  type="number"
                  min={delayMin}
                  max={600}
                  value={delayMax}
                  onChange={(e) => setDelayMax(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Target Accounts */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Отправлять через:
            </label>
            <select
              value={targetAccs}
              onChange={(e) => setTargetAccs(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl apple-glass-input text-white text-xs outline-none"
            >
              <option value="all" className="bg-[#11131f] text-white">
                🌐 Все активные аккаунты ({accounts.length})
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={String(acc.id)} className="bg-[#11131f] text-white">
                  📱 {acc.phone} (ID: {acc.id})
                </option>
              ))}
            </select>
          </div>

          {/* Loop Mode Toggle */}
          <div
            onClick={() => {
              triggerHaptic('selection');
              setIsLoop(!isLoop);
            }}
            className="apple-glass rounded-2xl p-3 flex items-center justify-between cursor-pointer border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <RotateCw className={`w-4 h-4 ${isLoop ? 'text-indigo-400' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-semibold text-white">Бесконечный автоповтор (Loop)</div>
                <div className="text-[11px] text-slate-400">Повторять рассылку по кругу после завершения</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isLoop}
              onChange={() => {}}
              className="w-4 h-4 rounded text-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all mt-2"
          >
            {isLoading ? 'Создание задачи...' : '✅ Создать и синхронизировать'}
          </button>
        </form>
      </div>
    </div>
  );
};
