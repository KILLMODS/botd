import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { X, Play, Square, RotateCw, Trash2, Save, Send, Image as ImageIcon, Users, Clock, AlertTriangle, Check } from 'lucide-react';
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
      alert(`Минимальная задержка для вашего тарифа (${plan.name}) составляет ${plan.min_delay} секунд!`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="apple-glass-card rounded-3xl max-w-md w-full p-5 sm:p-6 relative shadow-2xl border-white/20 my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
              <Send className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Задача #{task.id}</h3>
              <p className="text-xs text-slate-400">Синхронизировано с ботом</p>
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

        {/* Content Body */}
        <div className="space-y-4 py-4 overflow-y-auto pr-1">
          {/* Main Action Bar: Run / Stop & Loop Toggle */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleToggleRun}
              disabled={isTogglingRun}
              className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 ${
                isRunning
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 shadow-rose-500/20'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-emerald-500/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Остановить рассылку</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Запустить рассылку</span>
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
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'apple-glass-button text-slate-300 border-white/10'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoop ? 'text-indigo-400' : ''}`} />
              <span>{isLoop ? '🔁 Бесконечно' : '1️⃣ Одиночный'}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="apple-glass rounded-2xl p-3 grid grid-cols-3 gap-2 text-center border-white/10">
            <div>
              <div className="text-emerald-400 font-bold text-sm">✅ {task.sent}</div>
              <div className="text-[10px] text-slate-400 uppercase">Отправлено</div>
            </div>
            <div>
              <div className="text-rose-400 font-bold text-sm">❌ {task.errors}</div>
              <div className="text-[10px] text-slate-400 uppercase">Ошибок</div>
            </div>
            <div>
              <div className="text-blue-400 font-bold text-sm">👥 {task.chats?.length || 0}</div>
              <div className="text-[10px] text-slate-400 uppercase">Чатов</div>
            </div>
          </div>

          {/* Broadcast Message Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Текст сообщения:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Введите текст рекламного или информационного сообщения..."
              className="w-full px-3 py-2.5 rounded-2xl apple-glass-input text-white text-xs outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Media Info */}
          <div className="apple-glass rounded-2xl p-3 flex items-center justify-between text-xs border-white/10">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300 font-medium">Медиа-вложение:</span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              {task.media ? '📷 Прикреплено (фото)' : '❌ Без медиа'}
            </span>
          </div>

          {/* Delay Range Settings */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Интервал задержки (секунды):
              </span>
              <span className="text-slate-400 font-mono">
                {delayMin} – {delayMax} сек
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="apple-glass rounded-2xl p-2 border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400">Минимум:</span>
                <input
                  type="number"
                  min={plan.min_delay}
                  max={600}
                  value={delayMin}
                  onChange={(e) => setDelayMin(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-sm outline-none"
                />
              </div>
              <div className="apple-glass rounded-2xl p-2 border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400">Максимум:</span>
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
            <p className="text-[10px] text-slate-500">
              Минимальная разрешенная задержка для тарифа {plan.name}: {plan.min_delay} сек.
            </p>
          </div>

          {/* Target Accounts Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Целевые аккаунты для рассылки:
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

          {/* Recipients List Preview */}
          {task.chats && task.chats.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Список чатов и каналов ({task.chats.length}):
              </label>
              <div className="max-h-28 overflow-y-auto space-y-1 apple-glass rounded-2xl p-2 border-white/10 text-xs font-mono">
                {task.chats.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-slate-300 text-[11px]">
                    <span className="truncate">@{c.username || c.chat_id}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      c.status === 'done' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-white/5'
                    }`}>
                      {c.status === 'done' ? 'Готово' : 'В очереди'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions: Save / Delete */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-10 h-10 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
            title="Удалить задачу"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Сохранение...' : 'Сохранить изменения'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
