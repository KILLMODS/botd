import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { X, Play, Square, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface TaskDetailModalProps {
  task: TaskItem;
  accounts: AccountItem[];
  user: UserProfile;
  onClose: () => void;
  onSave: (taskId: number, updates: Partial<TaskItem>) => Promise<void>;
  onToggleRun: (taskId: number, currentStatus: string) => Promise<void>;
  onDelete: (taskId: number) => Promise<void>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  accounts,
  user,
  onClose,
  onSave,
  onToggleRun,
  onDelete,
}) => {
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;

  const [text, setText] = useState(task.text);
  const [delayMin, setDelayMin] = useState(task.delay_min);
  const [delayMax, setDelayMax] = useState(task.delay_max);
  const [isLoop, setIsLoop] = useState(task.loop === 1);
  const [targetAccs, setTargetAccs] = useState(task.target_accs || 'all');
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingRun, setIsTogglingRun] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isRunning = task.status === 'running';

  const handleSave = async () => {
    if (delayMin < plan.min_delay) {
      triggerHaptic('error');
      alert(`Минимальная задержка для тарифа ${plan.name} составляет ${plan.min_delay} секунд!`);
      return;
    }
    triggerHaptic('medium');
    setIsSaving(true);
    try {
      await onSave(task.id, {
        text,
        delay_min: delayMin,
        delay_max: Math.max(delayMin, delayMax),
        loop: isLoop ? 1 : 0,
        target_accs: targetAccs,
      });
      triggerHaptic('success');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRun = async () => {
    triggerHaptic('medium');
    setIsTogglingRun(true);
    try {
      await onToggleRun(task.id, task.status);
    } finally {
      setIsTogglingRun(false);
    }
  };

  const handleDelete = async () => {
    triggerHaptic('warning');
    if (confirm(`Удалить задачу #${task.id}?`)) {
      setIsDeleting(true);
      try {
        await onDelete(task.id);
        triggerHaptic('success');
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md w-full p-5 relative shadow-xl my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-900 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-white">Задача #{task.id}</h3>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
              Создана для рассылки
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

        {/* Content Body */}
        <div className="space-y-3.5 py-3 overflow-y-auto pr-0.5">
          {/* Main Action Bar */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleToggleRun}
              disabled={isTogglingRun}
              className={`py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-colors ${
                isRunning
                  ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Остановить</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Запустить</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                triggerHaptic('selection');
                setIsLoop(!isLoop);
              }}
              className={`py-2.5 px-3 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 border transition-colors ${
                isLoop
                  ? 'bg-neutral-800 text-white border-neutral-700'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <span>{isLoop ? 'Режим: Цикл' : 'Режим: Одиночный'}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-2.5 grid grid-cols-3 gap-2 text-center font-mono">
            <div>
              <div className="text-white text-xs">{task.sent}</div>
              <div className="text-[10px] text-neutral-500">Отправлено</div>
            </div>
            <div>
              <div className="text-neutral-300 text-xs">{task.errors}</div>
              <div className="text-[10px] text-neutral-500">Ошибок</div>
            </div>
            <div>
              <div className="text-white text-xs">{task.chats?.length || 0}</div>
              <div className="text-[10px] text-neutral-500">Получателей</div>
            </div>
          </div>

          {/* Text input */}
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">
              Текст сообщения:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Текст рассылки..."
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs outline-none resize-none leading-relaxed focus:border-neutral-700"
            />
          </div>

          {/* Delay Range */}
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

          {/* Target Accounts Selection */}
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
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-neutral-900 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-red-400 transition-colors"
            title="Удалить задачу"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-medium text-xs transition-colors"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};
