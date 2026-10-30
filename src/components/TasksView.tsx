import React, { useState } from 'react';
import { TaskItem, AccountItem, UserProfile } from '../types';
import { Plus, Send, Play, Square, RotateCw, Image as ImageIcon, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react';
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
  user,
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            Выполняется
          </span>
        );
      case 'done':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
            <CheckCircle className="w-3 h-3 text-blue-400" />
            Завершена
          </span>
        );
      case 'limit_reached':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Лимит тарифа
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
            <Clock className="w-3 h-3 text-slate-400" />
            Остановлена
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Banner / Create Task */}
      <div className="apple-glass-card rounded-3xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Задачи рассылки</h2>
            <p className="text-xs text-slate-400">
              Всего: <span className="font-semibold text-white">{tasks.length}</span> кампаний
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic('medium');
            onOpenCreateModal();
          }}
          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Создать</span>
        </button>
      </div>

      {/* TASKS LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Активные и сохраненные задачи
          </h3>
          <span className="text-[11px] text-slate-500">Синхронизировано с ботом</span>
        </div>

        {tasks.length === 0 ? (
          <div className="apple-glass-card rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Задач пока нет</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Создайте задачу рассылки с текстом, медиа и получателями. Она появится и в Telegram боте!
              </p>
            </div>
            <button
              onClick={() => {
                triggerHaptic('medium');
                onOpenCreateModal();
              }}
              className="mt-2 px-4 py-2 rounded-2xl apple-glass-button text-xs font-semibold text-blue-400 hover:text-white"
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
                className="apple-glass-card rounded-3xl p-4.5 cursor-pointer hover:border-white/20 active:scale-[0.99] transition-all space-y-3 group"
              >
                {/* Header row: ID, badges, play/stop */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white font-mono">
                      #{task.id}
                    </span>
                    {getStatusBadge(task.status)}
                    {task.loop === 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                        <RotateCw className="w-2.5 h-2.5 animate-spin-slow" />
                        Бесконечный цикл
                      </span>
                    )}
                    {task.media && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-400/30">
                        <ImageIcon className="w-2.5 h-2.5" />
                        Фото
                      </span>
                    )}
                  </div>

                  {/* Play / Stop button */}
                  <button
                    onClick={(e) => handleToggleRun(e, task)}
                    disabled={isToggling}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                      isRunning
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
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

                {/* Text excerpt */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-black/20 p-2.5 rounded-2xl border border-white/5">
                  {task.text || 'Текст рассылки не указан'}
                </p>

                {/* Stats & footer: sent, errors, interval, recipients */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-semibold text-[11px]">
                      ✅ {task.sent}
                    </span>
                    <span className="text-rose-400 font-semibold text-[11px]">
                      ❌ {task.errors}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-[11px] text-slate-400">
                      ⏱ {task.delay_min}–{task.delay_max}с
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-[11px] text-slate-400">
                      👥 {task.chats?.length || 0} чатов
                    </span>
                  </div>

                  <div className="flex items-center text-blue-400 text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>Подробнее</span>
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
