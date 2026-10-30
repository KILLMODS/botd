import React from 'react';
import { X, Shield, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface TermsModalProps {
  onClose: () => void;
  onAccept?: () => void;
  isInitialPrompt?: boolean;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  onClose,
  onAccept,
  isInitialPrompt = false
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Условия и политика</h3>
              <p className="text-[11px] text-neutral-400">Правила использования TG Broadcaster</p>
            </div>
          </div>
          {!isInitialPrompt && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs text-neutral-300 leading-relaxed">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-200">
              <strong className="block text-white mb-0.5">Ограничение ответственности</strong>
              Сервис не гарантирует сохранность аккаунтов. Возможные спам-блокировки или санкции со стороны Telegram находятся вне зоны ответственности сервиса и остаются целиком в руках пользователя.
            </div>
          </div>

          <div className="space-y-1.5 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-3.5">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-neutral-400" />
              1. Назначение сервиса
            </h4>
            <p className="text-neutral-400 text-[11px]">
              TG Broadcaster является программным инструментом автоматизации отправки сообщений в Telegram по списку чатов, предоставленному пользователем.
            </p>
          </div>

          <div className="space-y-1.5 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-3.5">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-neutral-400" />
              2. Риски и ответственность пользователя
            </h4>
            <p className="text-neutral-400 text-[11px]">
              Пользователь самостоятельно несет полную ответственность за соблюдение Пользовательского соглашения Telegram, за используемые списки получателей, тексты рассылок и настройки пауз между отправками.
            </p>
          </div>

          <div className="space-y-1.5 bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-3.5">
            <h4 className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
              3. Конфиденциальность данных
            </h4>
            <p className="text-neutral-400 text-[11px]">
              Данные авторизации (сессии) используются исключительно для выполнения задач рассылки, запущенных пользователем. Сервис не читает, не хранит и не передает третьим лицам личные переписки.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {isInitialPrompt ? (
            <button
              onClick={() => {
                triggerHaptic('success');
                if (onAccept) onAccept();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Принять условия</span>
            </button>
          ) : (
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors"
            >
              Понятно, закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
