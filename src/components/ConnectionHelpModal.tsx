import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { botApi, BOTHOST_URL } from '../services/api';

interface ConnectionHelpModalProps {
  onClose: () => void;
  onRefreshData: () => Promise<void>;
}

export const ConnectionHelpModal: React.FC<ConnectionHelpModalProps> = ({ onClose, onRefreshData }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setChecking(true);
    setResult(null);
    const res = await botApi.checkHealth();
    setResult(res);
    setChecking(false);
    if (res.ok) {
      await onRefreshData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-sm p-5 space-y-4 text-white shadow-xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
          <div>
            <h3 className="text-sm font-semibold text-white">Синхронизация с bothost.ru</h3>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">bot_1793274038_8713_black_kot198</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-neutral-900 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-neutral-300">
          <p className="text-neutral-400 leading-relaxed">
            Инструкция для bothost.ru:
          </p>

          <div className="space-y-2">
            <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
              <div className="font-medium text-white text-xs">
                1. Замените 1.py
              </div>
              <div className="text-[11px] text-neutral-400">
                Вкладка «Файлы» → загрузите обновленный 1.py с изоляцией аккаунтов и задач.
              </div>
            </div>

            <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
              <div className="font-medium text-white text-xs">
                2. Проверьте порт
              </div>
              <div className="text-[11px] text-neutral-400">
                Вкладка «Домен» → Порт веб-приложения: 3000 → нажать «Сохранить».
              </div>
            </div>

            <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-1">
              <div className="font-medium text-white text-xs">
                3. Перезапустите бота
              </div>
              <div className="text-[11px] text-neutral-400">
                Вкладка «Запуск» → нажмите «Перезапустить».
              </div>
            </div>
          </div>

          <div className="p-2 bg-neutral-900/50 border border-neutral-800/80 rounded-xl text-[11px] font-mono text-neutral-400 break-all">
            {BOTHOST_URL}
          </div>

          {result && (
            <div
              className={`p-2.5 rounded-xl border text-xs font-mono ${
                result.ok
                  ? 'bg-neutral-900 border-neutral-700 text-emerald-400'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              {result.message}
            </div>
          )}

          <div className="pt-1 flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={checking}
              className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Проверка...' : 'Проверить связь'}</span>
            </button>
            <button
              onClick={onClose}
              className="py-2 px-3 rounded-xl border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white text-xs font-medium transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
