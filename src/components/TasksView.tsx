import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { Plus, Play, Square, Layers, RotateCw, MessageSquareQuote } from 'lucide-react';
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

  const getStatusBadge = (status: TaskItem['status']) => {
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
    <div className="space-y-4 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h2 className="text-[17px] font-semibold text-white tracking-tight">Задачи рассылки</h2>
          <p className="text-[12px] text-neutral-400">
            {tasks.length} активных кампаний
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

      {/* Tasks List */}
      <div className="space-y-2.5">
        {tasks.length === 0 ? (
          <div className="apple-group-card p-8 text-center space-y-3">
            <Layers className="w-10 h-10 text-neutral-500 mx-auto" />
            <h4 className="text-[15px] font-semibold text-white">Задач пока нет</h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
              Создайте задачу с текстом рассылки, списком получателей, умной задержкой и автоответчиком.
            </p>
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenCreateModal();
              }}
              className="mt-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all active:scale-95"
            >
              + Создать первую задачу
            </button>
          </div>
        ) : (
          tasks.map((task) => {
            const isRunning = task.status === 'running';
            const isToggling = loadingTaskId === task.id;

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-white">
                      #{task.id}
                    </span>
                    {getStatusBadge(task.status)}
                    {task.loop === 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.08] text-neutral-300 flex items-center gap-1">
                        <RotateCw className="w-2.5 h-2.5" />
                        цикл
                      </span>
                    )}
                    {task.auto_reply === 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <MessageSquareQuote className="w-3 h-3" />
                        автоответ
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
                    <span>Отправлено: <strong className="text-white">{task.sent}</strong></span>
                    {task.errors > 0 && <span className="text-rose-400">Ошибок: {task.errors}</span>}
                  </div>
                  <span>Задержка: {task.delay_min}–{task.delay_max}с</span>
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
