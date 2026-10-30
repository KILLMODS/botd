import React, { useState } from 'react';
import { X, Server, CheckCircle2, AlertCircle, RefreshCw, Terminal, Shield, Save } from 'lucide-react';
import { botApi } from '../services/api';
import { triggerHaptic } from '../services/telegram';

interface SettingsModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  onRefresh,
}) => {
  const [apiUrl, setApiUrl] = useState(botApi.getApiUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);

  const handleSaveAndTest = async () => {
    triggerHaptic('medium');
    botApi.setApiUrl(apiUrl);
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await botApi.checkServerConnection();
      setTestResult(res);
      if (res.connected) {
        triggerHaptic('success');
      } else {
        triggerHaptic('warning');
      }
      onRefresh();
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="apple-glass-card rounded-3xl max-w-md w-full p-6 relative shadow-2xl border-white/20 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Связь с ботом (bothost.ru)</h3>
              <p className="text-xs text-slate-400">Настройка API синхронизации</p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-8 h-8 rounded-full apple-glass-button flex items-center justify-center text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              URL сервера бота (bothost.ru или ваш хостинг):
            </label>
            <input
              type="url"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://bot-1793274038-8713-black-kot198.bothost.tech"
              className="w-full px-3 py-2.5 rounded-2xl apple-glass-input text-white text-xs font-mono outline-none"
            />
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setApiUrl('https://bot-1793274038-8713-black-kot198.bothost.tech')}
                className="text-[11px] text-blue-400 hover:text-blue-300 underline"
              >
                Вставить домен из bothost: bot-1793...bothost.tech
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              💡 <strong>Как это работает на bothost.ru:</strong> Во вкладке «Домен» у вас включен порт 3000 и выдан домен <span className="font-mono text-blue-300">bothost.tech</span>. Скрипт <span className="font-mono text-slate-200">1.py</span> настроен слушать именно порт 3000 внутри контейнера. Поэтому сервер bothost.ru автоматически проксирует все запросы из Vercel прямо в бота!
            </p>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
              testResult.connected
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}>
              {testResult.connected ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Bot Admin reference */}
          <div className="apple-glass rounded-2xl p-3 border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Shield className="w-3.5 h-3.5" />
              <span>Админ-команды в боте (1.py):</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              <div><code>/admin</code> — панель администратора</div>
              <div><code>/give_sub [user_id] [pro|premium] [дней]</code></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center gap-2">
          <button
            onClick={handleSaveAndTest}
            disabled={isTesting}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Проверка соединения...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Сохранить и проверить</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
