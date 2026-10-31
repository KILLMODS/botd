import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS, BOT_USERNAME } from '../services/api';
import { 
  X, 
  Play, 
  Square, 
  Trash2, 
  Clock, 
  MessageSquareQuote, 
  Repeat, 
  ShieldCheck, 
  Send, 
  Sparkles, 
  AlertOctagon, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
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
  const isFree = user.sub_plan === 'free';

  const [text, setText] = useState(task.text);
  const [delayMin, setDelayMin] = useState(task.delay_min);
  const [delayMax, setDelayMax] = useState(task.delay_max);
  const [isLoop, setIsLoop] = useState(task.loop === 1);
  const [targetAccs, setTargetAccs] = useState(task.target_accs || 'all');
  
  // Auto-responder state
  const [autoReply, setAutoReply] = useState(task.auto_reply === 1);
  const [autoReplyText, setAutoReplyText] = useState(task.auto_reply_text || '');
  const [autoReplyMode, setAutoReplyMode] = useState(task.auto_reply_mode || 'offline_only');

  // PR bots auto-solver
  const [autoResolvePrBots, setAutoResolvePrBots] = useState(task.auto_resolve_pr_bots ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingRun, setIsTogglingRun] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isRunning = task.status === 'running';
  const hasSpamBlock = (task.spamblocks && task.spamblocks > 0) || task.status === 'spamblock';

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
        auto_reply_mode: autoReplyMode,
        auto_resolve_pr_bots: autoResolvePrBots,
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
            <div className="flex items-center gap-2">
              <h3 className="text-[17px] font-semibold text-white tracking-tight">Задача #{task.id}</h3>
              {task.mode === 'direct_messages' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  💬 Рассылка по ЛС
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-neutral-300">
                  📢 По группам
                </span>
              )}
            </div>
            <p className="text-[12px] text-neutral-400 font-mono mt-0.5">
              Статус: {isRunning ? '🟢 В процессе' : task.status === 'spamblock' ? '🛑 Спам-блок (пауза)' : '⏹ Остановлена'}
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
          
          {/* Spam-block warning alert with red exclamation mark */}
          {hasSpamBlock && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-rose-300 flex items-center gap-1.5">
                  <span>🛑 Зафиксирован Спам-блок (SpamBlock / FloodWait)</span>
                </div>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  Telegram временно ограничил отправку с аккаунта. Бот автоматически приостановил кампанию для защиты аккаунта от постоянного бана. Вы можете сменить аккаунт или повторить позже.
                </p>
              </div>
            </div>
          )}

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

          {/* Detailed Delivery & Error Statistics Grid */}
          <div className="apple-group-card p-3 grid grid-cols-4 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white/[0.03]">
              <div className="text-emerald-400 text-[17px] font-bold font-mono">{task.sent}</div>
              <div className="text-[10px] text-neutral-400 font-medium">Доставлено</div>
            </div>

            <div className={`p-2 rounded-xl ${hasSpamBlock ? 'bg-rose-500/10 border border-rose-500/25' : 'bg-white/[0.03]'}`}>
              <div className="text-rose-400 text-[17px] font-bold font-mono flex items-center justify-center gap-1">
                {task.spamblocks || 0}
                {hasSpamBlock && <span className="text-xs text-rose-400 font-bold">!</span>}
              </div>
              <div className="text-[10px] text-neutral-400 font-medium">Спам-блок</div>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.03]">
              <div className="text-amber-400 text-[17px] font-bold font-mono">{task.errors}</div>
              <div className="text-[10px] text-neutral-400 font-medium">Ошибок</div>
            </div>

            <div className="p-2 rounded-xl bg-white/[0.03]">
              <div className="text-blue-400 text-[17px] font-bold font-mono">{task.chats?.length || 0}</div>
              <div className="text-[10px] text-neutral-400 font-medium">Получателей</div>
            </div>
          </div>

          {/* Active Features Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {task.has_premium_emojis && (
              <span className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/25 text-amber-300 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Premium Emojis
              </span>
            )}
            {task.auto_resolve_pr_bots && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Решение PR-ботов
              </span>
            )}
            {task.auto_reply === 1 && (
              <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 font-medium flex items-center gap-1">
                <MessageSquareQuote className="w-3 h-3 text-purple-400" /> Автоответчик
              </span>
            )}
            {isFree && (
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-neutral-400 font-medium">
                Вотермарка (Free)
              </span>
            )}
          </div>

          {/* Text input */}
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
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Текст рассылки..."
              className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white text-[13px] outline-none resize-none leading-relaxed focus:border-white/20 transition-all placeholder:text-neutral-500"
            />
          </div>

          {/* Auto-solve PR/Guard bots toggle */}
          <div className="apple-group-card p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-[13px] font-medium text-white block">Автопрохождение PR-ботов</span>
                <span className="text-[11px] text-neutral-400">Вступает в группы и нажимает кнопки проверки</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setAutoResolvePrBots(!autoResolvePrBots);
              }}
              className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                autoResolvePrBots ? 'bg-emerald-600' : 'bg-neutral-700/80'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  autoResolvePrBots ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Autoresponder in PM toggle */}
          <div className="apple-group-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquareQuote className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-[13px] font-medium text-white block">Автоответчик</span>
                  <span className="text-[11px] text-neutral-400">Ответ на первое входящее сообщение</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setAutoReply(!autoReply);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                  autoReply ? 'bg-purple-600' : 'bg-neutral-700/80'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    autoReply ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {autoReply && (
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <input
                  type="text"
                  value={autoReplyText}
                  onChange={(e) => setAutoReplyText(e.target.value)}
                  placeholder="Текст ответа на первое сообщение..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-white text-xs outline-none focus:border-purple-500/40"
                />
              </div>
            )}
          </div>

          {/* Delay Range */}
          <div className="apple-group-card p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-[13px] font-medium text-white">Интервал задержки</span>
              </div>
              <span className="text-[11px] text-neutral-400 font-mono">
                Мин. для тарифа: {plan.min_delay}с
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2">
                <span className="text-[10px] text-neutral-400 block font-medium">От (секунд)</span>
                <input
                  type="number"
                  value={delayMin}
                  onChange={(e) => setDelayMin(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-[14px] outline-none mt-0.5"
                />
              </div>
              <div className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2">
                <span className="text-[10px] text-neutral-400 block font-medium">До (секунд)</span>
                <input
                  type="number"
                  value={delayMax}
                  onChange={(e) => setDelayMax(Number(e.target.value))}
                  className="w-full bg-transparent text-white font-mono text-[14px] outline-none mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Account selector */}
          <div className="apple-group-card p-3.5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-white">Аккаунты для отправки:</span>
            <select
              value={targetAccs}
              onChange={(e) => setTargetAccs(e.target.value)}
              className="bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-white text-xs outline-none focus:border-white/20 max-w-[200px]"
            >
              <option value="all" className="bg-[#1c1d24]">Все мои ({accounts.length})</option>
              {accounts.map(a => (
                <option key={a.id} value={String(a.id)} className="bg-[#1c1d24]">{a.phone}</option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="pt-2 pb-6 space-y-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-neutral-300 font-semibold text-[13px] transition-colors"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[13px] transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full py-2.5 rounded-2xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Удалить задачу</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
