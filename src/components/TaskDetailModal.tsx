import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { X, Play, Square, Trash2, Clock, MessageSquareQuote, Lock, Repeat } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface TaskDetailModalProps {
  task: TaskItem;
  accounts: AccountItem[];
  user: UserProfile;
  onClose: () => void;
  onSave: (taskId: number, updates: Partial<TaskItem>) => Promise<void>;
  onToggleRun: (taskId: number, currentStatus: string) => Promise<void>;
  onDelete: (taskId: number) => Promise<void>;
  onOpenSubscriptions?: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  accounts,
  user,
  onClose,
  onSave,
  onToggleRun,
  onDelete,
  onOpenSubscriptions,
}) => {
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;
  const isProOrPrem = user.sub_plan === 'pro' || user.sub_plan === 'premium';

  const [text, setText] = useState(task.text);
  const [delayMin, setDelayMin] = useState(task.delay_min);
  const [delayMax, setDelayMax] = useState(task.delay_max);
  const [isLoop, setIsLoop] = useState(task.loop === 1);
  const [targetAccs, setTargetAccs] = useState(task.target_accs || 'all');
  
  // Auto-responder state
  const [autoReply, setAutoReply] = useState(task.auto_reply === 1);
  const [autoReplyText, setAutoReplyText] = useState(task.auto_reply_text || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingRun, setIsTogglingRun] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isRunning = task.status === 'running';

  const handleSave = async () => {
    let validMin = Number(delayMin);
    let validMax = Number(delayMax);
    if (isNaN(validMin) || validMin < 1) validMin = plan.min_delay;
    if (isNaN(validMax) || validMax < validMin) validMax = validMin + 15;

    if (validMin < plan.min_delay) {
      triggerHaptic('error');
      alert(`Минимальная задержка для тарифа ${plan.name} составляет ${plan.min_delay} секунд!`);
      return;
    }

    triggerHaptic('medium');
    setIsSaving(true);
    try {
      await onSave(task.id, {
        text,
        delay_min: validMin,
        delay_max: validMax,
        loop: isLoop ? 1 : 0,
        target_accs: targetAccs,
        auto_reply: autoReply ? 1 : 0,
        auto_reply_text: autoReplyText.trim() || undefined,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xl animate-fade-in p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-[#14151a]/95 border-t sm:border border-white/[0.12] rounded-t-[28px] sm:rounded-[28px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden apple-liquid-sheet">
        
        {/* iOS Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.08] flex-shrink-0">
          <div>
            <h3 className="text-[17px] font-semibold text-white tracking-tight">Задача #{task.id}</h3>
            <p className="text-[12px] text-neutral-400 font-mono">
              Статус: {task.status === 'running' ? '🟢 В процессе' : '⏹ Остановлена'}
            </p>
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          
          {/* Main Action Bar */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleToggleRun}
              disabled={isTogglingRun}
              className={`py-3 px-4 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                isRunning
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
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
                  <span>Запустить рассылку</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                triggerHaptic('selection');
                setIsLoop(!isLoop);
              }}
              className={`py-3 px-4 rounded-2xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-all border ${
                isLoop
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                  : 'bg-white/[0.05] text-neutral-300 border-white/[0.08] hover:bg-white/[0.08]'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>{isLoop ? 'Цикл: Вкл' : 'Цикл: Выкл'}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="apple-group-card p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-white text-[17px] font-bold font-mono">{task.sent}</div>
              <div className="text-[10px] text-neutral-400 font-medium">Отправлено</div>
            </div>
            <div>
              <div className="text-rose-400 text-[17px] font-bold font-mono">{task.errors}</div>
              <div className="text-[10px] text-neutral-400 font-medium">Ошибок</div>
            </div>
            <div>
              <div className="text-blue-400 text-[17px] font-bold font-mono">{task.chats?.length || 0}</div>
              <div className="text-[10px] text-neutral-400 font-medium">Получателей</div>
            </div>
          </div>

          {/* Text input */}
          <div className="apple-group-card p-3.5 space-y-2">
            <label className="text-[13px] font-medium text-white">
              Текст сообщения
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Текст рассылки..."
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-[13px] outline-none resize-none leading-relaxed focus:border-white/20 transition-all placeholder:text-neutral-500"
            />
          </div>

          {/* Delay Range */}
          <div className="apple-group-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-white font-medium">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Интервал задержки</span>
              </div>
              <span className="text-neutral-400 font-mono text-[11px]">
                мин: {plan.min_delay}с
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2">
                <span className="text-[10px] text-neutral-400 block font-medium">От (сек)</span>
                <input
                  type="number"
                  value={delayMin}
                  onChange={(e) => setDelayMin(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-sm outline-none mt-0.5"
                />
              </div>
              <div className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2">
                <span className="text-[10px] text-neutral-400 block font-medium">До (сек)</span>
                <input
                  type="number"
                  value={delayMax}
                  onChange={(e) => setDelayMax(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-sm outline-none mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Auto-responder Toggle */}
          <div className="apple-group-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-white">Автоответчик в чатах</span>
                    {!isProOrPrem && (
                      <span className="text-[9px] font-bold text-amber-300 bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.2 rounded-full uppercase">
                        PRO
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
                onClick={() => {
                  if (!isProOrPrem) {
                    triggerHaptic('warning');
                    if (onOpenSubscriptions) {
                      onClose();
                      onOpenSubscriptions();
                    }
                    return;
                  }
                  triggerHaptic('light');
                  setAutoReply(prev => !prev);
                }}
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

            {autoReply && isProOrPrem && (
              <div className="pt-2 border-t border-white/[0.06] space-y-1">
                <span className="text-[11px] text-neutral-400">Текст автоответа:</span>
                <input
                  type="text"
                  value={autoReplyText}
                  onChange={(e) => setAutoReplyText(e.target.value)}
                  placeholder="Оставьте пустым для текста задачи..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-white text-xs outline-none focus:border-white/20"
                />
              </div>
            )}
          </div>

          {/* Target Accounts Selection */}
          <div className="apple-group-card p-3.5 flex items-center justify-between gap-3">
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
        </div>

        {/* Footer Actions */}
        <div className="px-4 pt-3 pb-6 border-t border-white/[0.08] flex items-center gap-2.5 flex-shrink-0">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-12 h-12 rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center transition-colors flex-shrink-0"
            title="Удалить задачу"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-3 px-5 rounded-2xl bg-white hover:bg-neutral-200 text-black font-semibold text-[14px] transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </div>
  );
};
