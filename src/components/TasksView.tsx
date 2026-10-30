import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { Plus, Play, Square, Layers, RotateCw } from 'lucide-react';
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
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-emerald-400">
            В процессе
          </span>
        );
      case 'done':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300">
            Завершена
          </span>
        );
      case 'limit_reached':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-amber-400">
            Лимит
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400">
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
          <h2 className="text-base font-semibold text-white">Задачи</h2>
          <p className="text-xs text-neutral-400">
            {tasks.length} кампаний
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenCreateModal();
          }}
          className="px-3.5 py-1.5 rounded-xl bg-white text-black font-medium text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Создать</span>
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-8 text-center space-y-3">
            <Layers className="w-8 h-8 text-neutral-600 mx-auto" />
            <h4 className="text-sm font-medium text-white">Задач пока нет</h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Создайте задачу с текстом рассылки, списком получателей и интервалом отправки.
            </p>
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenCreateModal();
              }}
              className="mt-1 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition-colors"
            >
              + Создать задачу
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
                className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 cursor-pointer hover:border-neutral-700 transition-colors space-y-2.5"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-white">
                      #{task.id}
                    </span>
                    {getStatusBadge(task.status)}
                    {task.loop === 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-400 flex items-center gap-1">
                        <RotateCw className="w-2.5 h-2.5" />
                        цикл
                      </span>
                    )}
                  </div>

                  <button
                    disabled={isToggling}
                    onClick={(e) => handleToggleRun(e, task)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      isRunning
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
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
                <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                  {task.text || 'Без текста'}
                </p>

                {/* Footer details */}
                <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono pt-1 border-t border-neutral-800/60">
                  <div className="flex items-center gap-3">
                    <span>Отправлено: {task.sent}</span>
                    {task.errors > 0 && <span className="text-red-400">Ошибок: {task.errors}</span>}
                  </div>
                  <span>Интервал: {task.delay_min}–{task.delay_max}с</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
