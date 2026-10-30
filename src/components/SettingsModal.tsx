import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Volume2, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  ChevronRight, 
  Check, 
  Server, 
  Sparkles, 
  ExternalLink,
  MessageSquareQuote,
  Info
} from 'lucide-react';
import { UserProfile } from '../types';
import { triggerHaptic } from '../services/telegram';
import { BOT_USERNAME } from '../services/api';

interface SettingsModalProps {
  user: UserProfile;
  onClose: () => void;
  onOpenTerms: () => void;
  onOpenSubscriptions: () => void;
  onResetCache: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  user,
  onClose,
  onOpenTerms,
  onOpenSubscriptions,
  onResetCache,
}) => {
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return localStorage.getItem('tgb_haptic_enabled') !== 'false';
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('tgb_sound_enabled') === 'true';
  });
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('tgb_custom_api_url') || 'http://localhost:8080';
  });
  const [isEditingApi, setIsEditingApi] = useState(false);
  const [cacheClearedNotice, setCacheClearedNotice] = useState(false);

  const isProOrPrem = user.sub_plan === 'pro' || user.sub_plan === 'premium';

  const toggleHaptic = () => {
    const next = !hapticEnabled;
    setHapticEnabled(next);
    localStorage.setItem('tgb_haptic_enabled', String(next));
    if (next) triggerHaptic('medium');
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('tgb_sound_enabled', String(next));
    triggerHaptic('light');
  };

  const handleClearCache = () => {
    triggerHaptic('warning');
    onResetCache();
    setCacheClearedNotice(true);
    setTimeout(() => setCacheClearedNotice(false), 3000);
  };

  const handleSaveApi = () => {
    localStorage.setItem('tgb_custom_api_url', apiUrl.trim());
    setIsEditingApi(false);
    triggerHaptic('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xl animate-fade-in">
      <div className="w-full sm:max-w-lg bg-[#14151a]/95 border-t sm:border border-white/[0.12] rounded-t-[28px] sm:rounded-[28px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden apple-liquid-sheet">
        
        {/* iOS Navigation Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.08] flex-shrink-0">
          <div className="w-16">
            <span className="text-[13px] text-neutral-400 font-medium">Apple iOS</span>
          </div>
          
          <h2 className="text-[17px] font-semibold text-white tracking-tight">Настройки</h2>
          
          <div className="w-16 flex justify-end">
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="text-[15px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              Готово
            </button>
          </div>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          
          {/* User Status Card */}
          <div className="apple-group-card p-4 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg flex-shrink-0">
              <div className="w-full h-full rounded-full bg-[#1c1d24] flex items-center justify-center font-bold text-white text-base">
                {user.first_name ? user.first_name[0].toUpperCase() : 'U'}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-[15px] truncate">
                  {user.first_name || 'Пользователь'}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  user.sub_plan === 'premium' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                  user.sub_plan === 'pro' ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30' :
                  'bg-white/10 text-neutral-300'
                }`}>
                  {user.sub_plan}
                </span>
              </div>
              <p className="text-[12px] text-neutral-400 mt-0.5 font-mono">
                ID: {user.user_id} {user.username ? `• @${user.username}` : ''}
              </p>
            </div>
            
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
                onOpenSubscriptions();
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white transition-all flex items-center gap-1"
            >
              Тариф
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>
          </div>

          {/* Section: Основные */}
          <div>
            <div className="px-3 pb-2 text-[12px] font-medium text-neutral-400 uppercase tracking-wider">
              Основные параметры
            </div>
            <div className="apple-group-card divide-y divide-white/[0.06]">
              {/* Haptic Feedback */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[14px] text-white font-medium">Тактильный отклик (Haptic)</div>
                    <div className="text-[11px] text-neutral-400">Вибрация при нажатии кнопок в Telegram</div>
                  </div>
                </div>
                
                {/* Cupertino Toggle */}
                <button
                  type="button"
                  onClick={toggleHaptic}
                  className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                    hapticEnabled ? 'bg-blue-500' : 'bg-neutral-700/80'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      hapticEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Effects */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[14px] text-white font-medium">Звуковые эффекты</div>
                    <div className="text-[11px] text-neutral-400">Уведомления о статусе рассылки</div>
                  </div>
                </div>
                
                {/* Cupertino Toggle */}
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`w-12 h-7 rounded-full transition-colors relative p-0.5 flex items-center ${
                    soundEnabled ? 'bg-blue-500' : 'bg-neutral-700/80'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Section: Автоответчик в чатах (Exclusive Pro / Premium) */}
          <div>
            <div className="px-3 pb-2 flex items-center justify-between text-[12px] font-medium text-neutral-400 uppercase tracking-wider">
              <span>Автоответчик в рассылках</span>
              <span className="text-amber-400 text-[10px] font-semibold bg-amber-400/15 px-2 py-0.5 rounded-full">
                Pro & Premium+
              </span>
            </div>
            
            <div className="apple-group-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <div className="flex-1 text-[13px] text-neutral-300 leading-relaxed">
                  <span className="text-white font-medium">Умный автоответ на сообщения в чатах:</span>{' '}
                  когда включен в настройках задачи, бот берёт последнее сообщение из чата и отвечает на него. Это отправляет push-уведомление автору и привлекает максимальное внимание участников!
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-neutral-400">Доступность функции:</span>
                {isProOrPrem ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Активна на вашем тарифе
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onClose();
                      onOpenSubscriptions();
                    }}
                    className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                  >
                    Перейти на Pro / Premium+ <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section: Подключение к Telegram боту */}
          <div>
            <div className="px-3 pb-2 text-[12px] font-medium text-neutral-400 uppercase tracking-wider">
              Сервер и бот
            </div>
            <div className="apple-group-card divide-y divide-white/[0.06]">
              {/* Bot Link */}
              <a
                href={`https://t.me/${BOT_USERNAME}`}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[14px] text-white font-medium">Официальный Telegram-бот</div>
                    <div className="text-[11px] text-blue-400 font-mono">@{BOT_USERNAME}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </a>

              {/* Server URL */}
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-700/50 text-neutral-300 flex items-center justify-center">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[14px] text-white font-medium">Сервер API (Bothost / Local)</div>
                      <div className="text-[11px] text-neutral-400">Синхронизация с 1.py</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setIsEditingApi(!isEditingApi)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    {isEditingApi ? 'Свернуть' : 'Изменить'}
                  </button>
                </div>

                {isEditingApi ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="http://localhost:8080"
                      className="flex-1 bg-black/40 border border-white/[0.12] rounded-xl px-3 py-1.5 text-xs text-white outline-none font-mono"
                    />
                    <button
                      onClick={handleSaveApi}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-medium"
                    >
                      Сохранить
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] font-mono text-neutral-400 mt-1 pl-10">
                    {apiUrl}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Данные и Безопасность */}
          <div>
            <div className="px-3 pb-2 text-[12px] font-medium text-neutral-400 uppercase tracking-wider">
              Данные и конфиденциальность
            </div>
            <div className="apple-group-card divide-y divide-white/[0.06]">
              {/* Terms & Privacy */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  onOpenTerms();
                }}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[14px] text-white font-medium">Условия использования и Политика</div>
                    <div className="text-[11px] text-neutral-400">Правила безопасной рассылки</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>

              {/* Clear Cache */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[14px] text-white font-medium">Очистить кэш приложения</div>
                    <div className="text-[11px] text-neutral-400">Сброс временных данных интерфейса</div>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors"
                >
                  {cacheClearedNotice ? 'Очищено!' : 'Очистить'}
                </button>
              </div>
            </div>
          </div>

          {/* App Info Footer */}
          <div className="text-center pt-2 pb-6 text-neutral-500 space-y-1">
            <div className="text-xs font-semibold text-neutral-400">TG Broadcaster Mini App</div>
            <div className="text-[11px] font-mono">Версия 2.5.0 • Apple Glassmorphism</div>
            <div className="text-[10px] text-neutral-600">Все права защищены • @{BOT_USERNAME}</div>
          </div>

        </div>
      </div>
    </div>
  );
};
