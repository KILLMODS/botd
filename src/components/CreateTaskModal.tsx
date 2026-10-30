import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { X } from 'lucide-react';
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
      setError('Укажите хотя бы одного получателя (по одному на строке)');
      return;
    }

    if (delayMin < plan.min_delay) {
      setError(`Минимальная задержка для вашего тарифа: ${plan.min_delay} сек.`);
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
        media: null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md w-full p-5 relative shadow-xl my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-900 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">Новая задача</h3>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
              Параметры кампании
            </p>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-7 h-7 rounded-lg bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 py-3 overflow-y-auto pr-0.5">
          {/* Text Area */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">
              Текст сообщения:
            </label>
            <textarea
              required
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введите текст рассылки..."
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs outline-none resize-none leading-relaxed focus:border-neutral-700"
            />
          </div>

          {/* Links Area */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="text-neutral-400">
                Получатели (каждый с новой строки):
              </label>
              <span className="text-neutral-500 font-mono text-[11px]">
                @username или t.me/link
              </span>
            </div>
            <textarea
              required
              rows={3}
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              placeholder={`@chat1\nhttps://t.me/chat2\nchat_id`}
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs outline-none font-mono resize-none leading-relaxed focus:border-neutral-700"
            />
          </div>

          {/* Delays */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">
                Задержка (сек):
              </span>
              <span className="text-neutral-500 font-mono text-[11px]">
                мин. для тарифа: {plan.min_delay}с
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5">
                <span className="text-[10px] text-neutral-500 block">От</span>
                <input
                  type="number"
                  min={plan.min_delay}
                  max={600}
                  value={delayMin}
                  onChange={(e) => setDelayMin(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-xs outline-none"
                />
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5">
                <span className="text-[10px] text-neutral-500 block">До</span>
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

          {/* Accounts selection */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">
              Отправлять с аккаунтов:
            </label>
            <select
              value={targetAccs}
              onChange={(e) => setTargetAccs(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs outline-none focus:border-neutral-700"
            >
              <option value="all" className="bg-neutral-950 text-white">
                Все мои аккаунты ({accounts.length})
              </option>
              {accounts.map((acc) => (
                <option key={acc.id} value={String(acc.id)} className="bg-neutral-950 text-white">
                  {acc.phone} (ID: {acc.id})
                </option>
              ))}
            </select>
          </div>

          {/* Loop toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={isLoop}
                onChange={(e) => setIsLoop(e.target.checked)}
                className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 accent-white"
              />
              <span>Бесконечный автоповтор (Loop)</span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-neutral-900 flex items-center justify-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-xs font-medium transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="py-2.5 px-5 rounded-xl bg-white hover:bg-neutral-200 text-black font-medium text-xs transition-colors"
            >
              {isLoading ? 'Создание...' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
