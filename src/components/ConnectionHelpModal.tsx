import React, { useState } from 'react';
import { X, CheckCircle, RefreshCw, Terminal, Globe, Play } from 'lucide-react';
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
      <div className="bg-neutral-950 border border-white/20 rounded-3xl w-full max-w-sm p-6 space-y-5 text-white shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold tracking-tight text-white">Синхронизация с bothost.ru</h3>
            <p className="text-[11px] text-neutral-400 font-mono mt-0.5">ID: bot_1793274038_8713_black_kot198</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-neutral-300">
          <p className="text-neutral-400 leading-relaxed">
            Чтобы аккаунты, задачи и подписка читали данные в реальном времени из бота, выполните 3 шага в панели <span className="text-white font-mono">bothost.ru</span>:
          </p>

          <div className="space-y-2.5">
            <div className="p-3 bg-neutral-900 border border-white/10 rounded-2xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white text-black font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                1
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-neutral-300" />
                  Замените файл 1.py
                </div>
                <div className="text-[11px] text-neutral-400">
                  В панели bothost откройте вкладку <b>«Файлы»</b> и загрузите обновленный <b>1.py</b> (с REST API сервером).
                </div>
              </div>
            </div>

            <div className="p-3 bg-neutral-900 border border-white/10 rounded-2xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white text-black font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                2
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-neutral-300" />
                  Нажмите «Сохранить» в Домене
                </div>
                <div className="text-[11px] text-neutral-400">
                  Вкладка <b>«🌐 Домен»</b> → Порт: <b>3000</b> → нажмите синюю кнопку <b>«💾 Сохранить»</b>!
                </div>
              </div>
            </div>

            <div className="p-3 bg-neutral-900 border border-white/10 rounded-2xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-white text-black font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                3
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-neutral-300" />
                  Перезапустите бота
                </div>
                <div className="text-[11px] text-neutral-400">
                  Вкладка <b>«▶️ Запуск»</b> → нажмите <b>«Перезапустить»</b>. В логах появится запуск на 0.0.0.0:3000.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <div className="text-[11px] text-neutral-400 font-mono break-all p-2 bg-neutral-900/60 rounded-xl border border-white/5">
              URL: {BOTHOST_URL}
            </div>
          </div>

          {result && (
            <div
              className={`p-3 rounded-2xl border text-xs font-mono flex items-center gap-2 ${
                result.ok
                  ? 'bg-white/10 border-white text-white'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-300'
              }`}
            >
              <CheckCircle className={`w-4 h-4 flex-shrink-0 ${result.ok ? 'text-white' : 'text-neutral-500'}`} />
              <span>{result.message}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={checking}
            className="flex-1 py-3 px-4 bg-white text-black font-bold text-xs rounded-2xl hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Проверка...' : 'Проверить связь'}
          </button>
          <button
            onClick={onClose}
            className="py-3 px-5 bg-neutral-900 border border-white/20 text-white font-bold text-xs rounded-2xl hover:bg-neutral-800 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
