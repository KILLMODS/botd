import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { X, Clock, Users, Image as ImageIcon, Plus } from 'lucide-react';
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
      setError('Укажите хотя бы одного получателя (каждый с новой строки)');
      return;
    }

    if (delayMin < plan.min_delay) {
      setError(`Минимальная задержка для тарифа ${plan.name} составляет ${plan.min_delay} сек.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-neutral-900 border border-white/20 rounded-3xl max-w-md w-full p-5 sm:p-6 relative shadow-2xl my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Plus className="w-4 h-4 stroke-[3]" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Новая задача рассылки</h3>
              <p className="text-xs text-neutral-400">Настройка параметров</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-2xl bg-neutral-800 border border-white/20 text-white text-xs font-mono">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 py-3 overflow-y-auto pr-1">
          {/* Message Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Текст сообщения:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Введите текст рассылки..."
              className="w-full px-3 py-2.5 rounded-2xl bg-black border border-white/15 text-white text-xs outline-none resize-none leading-relaxed focus:border-white"
              required
            />
          </div>

          {/* Media Checkbox */}
          <div
            onClick={() => {
              triggerHaptic('selection');
              setHasMedia(!hasMedia);
            }}
            className="bg-black/50 border border-white/10 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-white/20 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-4 h-4 text-white" />
              <div>
                <div className="text-xs font-semibold text-white">Прикрепить фото</div>
                <div className="text-[11px] text-neutral-400">Отправка с фотографией</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hasMedia}
              onChange={() => {}}
              className="w-4 h-4 rounded text-black accent-white"
            />
          </div>

          {/* Recipients / Chats */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Получатели (по одному на строку):
            </label>
            <textarea
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              rows={3}
              placeholder={'@username\nhttps://t.me/chat\n@group_ad'}
              className="w-full px-3 py-2.5 rounded-2xl bg-black border border-white/15 text-white text-xs font-mono outline-none resize-none focus:border-white"
              required
            />
          </div>

          {/* Delay Range */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white" />
                Задержка (сек):
              </span>
              <span className="text-neutral-400 font-mono text-[11px]">
                {delayMin} – {delayMax}с
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/50 border border-white/10 rounded-2xl p-2">
                <span className="text-[10px] text-neutral-400 block mb-1">Мин:</span>
                <input
                  type="number"
                  min={plan.min_delay}
                  max={300}
                  value={delayMin}
                  onChange={(e) => setDelayMin(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-xs outline-none"
                />
              </div>
              <div className="bg-black/50 border border-white/10 rounded-2xl p-2">
                <span className="text-[10px] text-neutral-400 block mb-1">Макс:</span>
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
            <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-white" />
              Отправлять с аккаунтов:
            </label>
            <select
              value={targetAccs}
              onChange={(e) => setTargetAccs(e.target.value)}
              className="w-full px-3 py-2.5 rounded-2xl bg-black border border-white/15 text-white text-xs outline-none focus:border-white"
            >
              <option value="all" className="bg-neutral-900 text-white">
                Все активные аккаунты ({accounts.length})
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={String(acc.id)} className="bg-neutral-900 text-white">
                  📱 {acc.phone} (ID: {acc.id})
                </option>
              ))}
            </select>
          </div>

          {/* Loop Mode */}
          <div
            onClick={() => {
              triggerHaptic('selection');
              setIsLoop(!isLoop);
            }}
            className="bg-black/50 border border-white/10 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-white/20 transition-colors"
          >
            <div>
              <div className="text-xs font-semibold text-white">Бесконечный цикл (Loop)</div>
              <div className="text-[11px] text-neutral-400">Повторять рассылку по кругу</div>
            </div>
            <input
              type="checkbox"
              checked={isLoop}
              onChange={() => {}}
              className="w-4 h-4 rounded text-black accent-white"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-white text-black font-bold text-sm hover:bg-neutral-200 active:scale-95 transition-all mt-2 shadow-lg"
          >
            {isLoading ? 'Создание...' : 'Создать задачу'}
          </button>
        </form>
      </div>
    </div>
  );
};
