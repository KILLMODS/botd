import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { Plus, ListTodo, Play, Square, RotateCw, Image as ImageIcon, ChevronRight } from 'lucide-react';
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
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-black inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping inline-block" />
            Выполняется
          </span>
        );
      case 'done':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-black">
            Завершена
          </span>
        );
      case 'limit_reached':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-white/10">
            Лимит тарифа
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400">
            Остановлена
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-neutral-900/70 border border-white/15 rounded-3xl p-4 flex items-center justify-between backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Задачи рассылки</h2>
            <p className="text-xs text-neutral-400">
              Всего: <span className="font-mono text-white font-bold">{tasks.length}</span> кампаний
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenCreateModal();
          }}
          className="px-3.5 py-2 rounded-2xl bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-neutral-200 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Создать</span>
        </button>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Активные задачи
          </h3>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-neutral-900/60 border border-white/10 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 mx-auto">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Задач пока нет</h4>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1">
                Создайте задачу с текстом рассылки, ссылками на группы и задержками.
              </p>
            </div>
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenCreateModal();
              }}
              className="mt-2 px-4 py-2 rounded-2xl bg-white text-black text-xs font-bold hover:bg-neutral-200"
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
                className="bg-neutral-900/70 border border-white/15 rounded-3xl p-4.5 cursor-pointer hover:border-white/30 active:scale-[0.99] transition-all space-y-3 backdrop-blur-2xl group"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white font-mono">
                      #{task.id}
                    </span>
                    {getStatusBadge(task.status)}
                    {task.loop === 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-white/10 inline-flex items-center gap-1">
                        <RotateCw className="w-2.5 h-2.5" />
                        Loop
                      </span>
                    )}
                    {task.media && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-white/10 inline-flex items-center gap-1">
                        <ImageIcon className="w-2.5 h-2.5" />
                        Медиа
                      </span>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleToggleRun(e, task)}
                    disabled={isToggling}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isRunning
                        ? 'bg-neutral-800 text-white border border-white/20 hover:bg-neutral-700'
                        : 'bg-white text-black hover:bg-neutral-200'
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
                        <span>Старт</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Excerpt */}
                <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed bg-black/40 p-2.5 rounded-2xl border border-white/5">
                  {task.text || 'Текст рассылки'}
                </p>

                {/* Stats row */}
                <div className="flex items-center justify-between text-xs text-neutral-400 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-white font-bold">✅ {task.sent}</span>
                    <span className="text-neutral-400">❌ {task.errors}</span>
                    <span>•</span>
                    <span>⏱ {task.delay_min}–{task.delay_max}с</span>
                    <span>•</span>
                    <span>👥 {task.chats?.length || 0}</span>
                  </div>

                  <div className="flex items-center text-white text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Открыть</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
