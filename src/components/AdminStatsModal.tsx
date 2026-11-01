import React, { useState, useEffect } from 'react';
import { X, Crown, BarChart3, TrendingUp, Users, Smartphone, Layers, RefreshCw, Radio } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';
import { botApi } from '../services/api';
import { AdminStats } from '../types';

interface AdminStatsModalProps {
  onClose: () => void;
}

export const AdminStatsModal: React.FC<AdminStatsModalProps> = ({ onClose }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const data = await botApi.getAdminStats();
      setStats(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalUsers = stats?.total_users || 1;
  const convAddAcc = stats ? Math.round((stats.clicked_add_acc / totalUsers) * 100) : 0;
  const convCreateTask = stats ? Math.round((stats.clicked_create_task / totalUsers) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Админ-панель</h3>
              <p className="text-[11px] text-neutral-400">Статистика и аналитика воронки</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                triggerHaptic('light');
                fetchStats();
              }}
              className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs text-neutral-300">
          {/* Funnel Card */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-white font-semibold">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span>Воронка пользователей:</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-400">1. Нажали /start (Всего пользователей)</span>
                  <span className="font-mono font-bold text-white">{stats?.total_users || 0}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-400">2. Нажали «Добавить аккаунт»</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {stats?.clicked_add_acc || 0} ({convAddAcc}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, convAddAcc)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-neutral-400">3. Нажали «Создать задачу»</span>
                  <span className="font-mono font-bold text-amber-400">
                    {stats?.clicked_create_task || 0} ({convCreateTask}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, convCreateTask)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Subscriptions Card */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-white font-semibold">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>Тарифы и продажи:</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-2.5">
                <div className="text-[10px] text-neutral-400">Free</div>
                <div className="text-base font-bold text-white font-mono mt-0.5">
                  {stats?.sub_free || 0}
                </div>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-2.5">
                <div className="text-[10px] text-blue-400">Pro (актив/купили)</div>
                <div className="text-base font-bold text-blue-400 font-mono mt-0.5">
                  {stats?.sub_pro || 0} / {stats?.total_purchases_pro || 0}
                </div>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-2.5">
                <div className="text-[10px] text-purple-400">Prem (актив/купили)</div>
                <div className="text-base font-bold text-purple-400 font-mono mt-0.5">
                  {stats?.sub_premium || 0} / {stats?.total_purchases_prem || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Tasks & Accounts Card */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Аккаунты:</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {stats?.total_accounts || 0}
              </div>
              <div className="text-[10px] text-neutral-500">
                У {stats?.users_with_accounts || 0} пользователей
              </div>
            </div>

            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Задачи рассылки:</span>
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {stats?.total_tasks_created || 0}
              </div>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{stats?.running_tasks_count || 0} в процессе</span>
              </div>
            </div>
          </div>

          {/* Referral Stats Card */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-white font-semibold">
              <div className="flex items-center gap-1.5 text-xs">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Реферальная статистика:</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                Бонусов: +{stats?.total_bonus_awarded || 0}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Приглашено по ссылкам:</span>
              <span className="font-mono text-white">{stats?.total_referred_users || 0} чел.</span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Подключили аккаунт (бонус выдан):</span>
              <span className="font-mono text-emerald-400">{stats?.total_rewarded_referrals || 0} чел.</span>
            </div>
          </div>

          {/* Channel status */}
          <div className="bg-neutral-900/30 border border-neutral-800/60 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-red-400" />
              Обязательный канал:
            </span>
            <span className="font-mono text-white">
              {stats?.required_channel || 'Отключен'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
