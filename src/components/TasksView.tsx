import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { 
  Plus, 
  Play, 
  Square, 
  Layers, 
  RotateCw, 
  MessageSquareQuote, 
  Clock, 
  AlertTriangle, 
  Filter, 
  Sparkles, 
  ShieldCheck, 
  Send,
  AlertOctagon
} from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface TasksViewProps {
  tasks: TaskItem[];
  accounts: AccountItem[];
  user: UserProfile;
  onOpenCreateModal: () => void;
  onSelectTask: (task: TaskItem) => void;
  onToggleTaskRun: (taskId: number, currentStatus: string) => Promise<void>;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  accounts,
  onOpenCreateModal,
  onSelectTask,
  onToggleTaskRun,
}) => {
  const [loadingTaskId, setLoadingTaskId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'idle'>('all');

  const handleToggleRun = async (e: React.MouseEvent, task: TaskItem) => {
    e.stopPropagation();
    if (accounts.length === 0 && task.status !== 'running') {
      triggerHaptic('error');
      alert('Сначала добавьте хотя бы один аккаунт во вкладке «Аккаунты»!');
      return;
    }
    triggerHaptic('medium');
    setLoadingTaskId(task.id);
    try {
      await onToggleTaskRun(task.id, task.status);
    } finally {
      setLoadingTaskId(null);
    }
  };

  const runningCount = tasks.filter(t => t.status === 'running').length;
  const totalSent = tasks.reduce((sum, t) => sum + (t.sent || 0), 0);
  const totalSpamblocks = tasks.reduce((sum, t) => sum + (t.spamblocks || (t.status === 'spamblock' ? 1 : 0)), 0);
  const totalErrors = tasks.reduce((sum, t) => sum + (t.errors || 0), 0);

  const filteredTasks = tasks.filter(task => {
    if (statusFilter === 'running') return task.status === 'running';
    if (statusFilter === 'idle') return task.status !== 'running';
    return true;
  });

  const getStatusBadge = (status: TaskItem['status'], spamblocks = 0) => {
    if (status === 'spamblock' || spamblocks > 0) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          🛑 Спам-блок !
        </span>
      );
    }

    switch (status) {
      case 'running':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            В процессе
          </span>
        );
      case 'done':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-neutral-300">
            Завершена
          </span>
        );
      case 'limit_reached':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Лимит
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-neutral-400 border border-white/[0.06]">
            Остановлена
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h2 className="text-[17px] font-semibold text-white tracking-tight">Задачи рассылки</h2>
          <p className="text-[12px] text-neutral-400">
            {tasks.length} сохраненных кампаний
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenCreateModal();
          }}
          className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Создать задачу</span>
        </button>
      </div>

      {/* Task Fleet Statistics Bar (with dedicated Spam-block tracking) */}
      <div className="apple-group-card p-3 grid grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="text-[10px] text-neutral-400 font-mono uppercase">Активны</div>
          <div className="text-base font-bold text-blue-400 font-mono mt-0.5">
            {runningCount}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="text-[10px] text-neutral-400 font-mono uppercase">Доставлено</div>
          <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
            {totalSent}
          </div>
        </div>

        <div className={`p-2 rounded-xl border ${totalSpamblocks > 0 ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/[0.03] border-white/[0.05]'}`}>
          <div className="text-[10px] text-neutral-400 font-mono uppercase flex items-center justify-center gap-0.5">
            <span>Спам-блок</span>
            {totalSpamblocks > 0 && <span className="text-rose-400 font-bold">!</span>}
          </div>
          <div className={`text-base font-bold font-mono mt-0.5 ${totalSpamblocks > 0 ? 'text-rose-400 animate-pulse' : 'text-neutral-300'}`}>
            {totalSpamblocks}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
          <div className="text-[10px] text-neutral-400 font-mono uppercase">Ошибок</div>
          <div className={`text-base font-bold font-mono mt-0.5 ${totalErrors > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
            {totalErrors}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-1.5 bg-[#181920]/80 p-1 rounded-xl border border-white/[0.06]">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setStatusFilter('all');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Все ({tasks.length})
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setStatusFilter('running');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'running'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            В процессе ({runningCount})
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setStatusFilter('idle');
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === 'idle'
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Остановлены ({tasks.length - runningCount})
          </button>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="apple-group-card p-8 text-center space-y-3">
            <Layers className="w-10 h-10 text-neutral-500 mx-auto" />
            <h4 className="text-[15px] font-semibold text-white">
              {tasks.length === 0 ? 'Задач пока нет' : 'Нет задач в данной категории'}
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
              {tasks.length === 0 
                ? 'Создайте задачу с текстом рассылки, списком получателей, умной задержкой и автоответчиком.'
                : 'Переключите фильтр для отображения остальных задач.'}
            </p>
            {tasks.length === 0 && (
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenCreateModal();
                }}
                className="mt-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all active:scale-95"
              >
                + Создать первую задачу
              </button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isRunning = task.status === 'running';
            const isToggling = loadingTaskId === task.id;
            const hasSpam = (task.spamblocks && task.spamblocks > 0) || task.status === 'spamblock';

            return (
              <div
                key={task.id}
                onClick={() => {
                  triggerHaptic('light');
                  onSelectTask(task);
                }}
                className="apple-group-card p-4 cursor-pointer hover:bg-white/[0.05] transition-all space-y-3 active:scale-[0.99]"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-sm font-bold text-white">
                      #{task.id}
                    </span>
                    {getStatusBadge(task.status, task.spamblocks)}

                    {task.mode === 'direct_messages' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                        <Send className="w-2.5 h-2.5" /> ЛС
                      </span>
                    )}

                    {task.has_premium_emojis && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Emojis
                      </span>
                    )}

                    {task.auto_resolve_pr_bots && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> PR-бот
                      </span>
                    )}

                    {task.loop === 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.08] text-neutral-300 flex items-center gap-1">
                        <RotateCw className="w-2.5 h-2.5" /> цикл
                      </span>
                    )}

                    {task.auto_reply === 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <MessageSquareQuote className="w-3 h-3" /> автоответ
                      </span>
                    )}
                  </div>

                  <button
                    disabled={isToggling}
                    onClick={(e) => handleToggleRun(e, task)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-90 ${
                      isRunning
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                        : 'bg-white hover:bg-neutral-200 text-black'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>Стоп</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Запуск</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Message preview */}
                <p className="text-[13px] text-neutral-200 line-clamp-2 leading-relaxed">
                  {task.text || 'Без текста'}
                </p>

                {/* Footer details */}
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span>Доставлено: <strong className="text-white">{task.sent}</strong></span>
                    {hasSpam && (
                      <span className="text-rose-400 font-bold flex items-center gap-0.5">
                        <AlertOctagon className="w-3 h-3" /> Спам-блок: {task.spamblocks || 1}
                      </span>
                    )}
                    {task.errors > 0 && <span className="text-amber-400">Ошибок: {task.errors}</span>}
                  </div>
                  <span>Интервал: {task.delay_min}–{task.delay_max}с</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {tasks.length > 0 && (
        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenCreateModal();
          }}
          className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[13px] flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Создать новую задачу</span>
        </button>
      )}
    </div>
  );
};
