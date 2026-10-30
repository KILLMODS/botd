import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { X, Play, Square, RotateCw, Trash2, Save, Send, Image as ImageIcon, Users, Clock } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-neutral-900 border border-white/20 rounded-3xl max-w-md w-full p-5 sm:p-6 relative shadow-2xl my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Send className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Задача #{task.id}</h3>
              <p className="text-xs text-neutral-400">Параметры кампании</p>
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

        {/* Content Body */}
        <div className="space-y-4 py-4 overflow-y-auto pr-1">
          {/* Main Action Bar */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleToggleRun}
              disabled={isTogglingRun}
              className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isRunning
                  ? 'bg-neutral-800 text-white border border-white/20 hover:bg-neutral-700'
                  : 'bg-white text-black hover:bg-neutral-200 shadow-md'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Остановить</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Запустить</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                triggerHaptic('selection');
                setIsLoop(!isLoop);
              }}
              className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all active:scale-95 ${
                isLoop
                  ? 'bg-white text-black border-white'
                  : 'bg-neutral-900 text-neutral-300 border-white/15 hover:border-white/30'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isLoop ? '🔁 Бесконечно' : '1️⃣ Одиночный'}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center font-mono">
            <div>
              <div className="text-white font-bold text-sm">✅ {task.sent}</div>
              <div className="text-[10px] text-neutral-400 uppercase">Отправлено</div>
            </div>
            <div>
              <div className="text-neutral-400 font-bold text-sm">❌ {task.errors}</div>
              <div className="text-[10px] text-neutral-400 uppercase">Ошибок</div>
            </div>
            <div>
              <div className="text-white font-bold text-sm">👥 {task.chats?.length || 0}</div>
              <div className="text-[10px] text-neutral-400 uppercase">Чатов</div>
            </div>
          </div>

          {/* Text input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Текст сообщения:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Текст рассылки..."
              className="w-full px-3 py-2.5 rounded-2xl bg-black border border-white/15 text-white text-xs outline-none resize-none leading-relaxed focus:border-white"
            />
          </div>

          {/* Media info */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-white" />
              <span className="text-white font-medium">Медиа:</span>
            </div>
            <span className="text-neutral-400 font-mono text-[11px]">
              {task.media ? '📷 Прикреплено' : '❌ Без медиа'}
            </span>
          </div>

          {/* Delay Range */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-white" />
                Интервал задержки:
              </span>
              <span className="text-neutral-400 font-mono">
                {delayMin} – {delayMax} сек
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/50 border border-white/10 rounded-2xl p-2">
                <span className="text-[10px] text-neutral-400 block mb-1">Мин:</span>
                <input
                  type="number"
                  min={plan.min_delay}
                  max={600}
                  value={delayMin}
                  onChange={(e) => setDelayMin(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-sm outline-none"
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
                  className="w-full bg-transparent text-white font-mono text-sm outline-none"
                />
              </div>
            </div>
          </div>

          {/* Target Accounts Selection */}
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
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-10 h-10 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-white/15 text-neutral-300 flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
            title="Удалить задачу"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-2xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-neutral-200 active:scale-95 transition-all shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Сохранение...' : 'Сохранить изменения'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
