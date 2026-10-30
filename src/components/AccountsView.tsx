import React, { useState } from 'react';
import { AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { Plus, Trash2, Smartphone, ShieldCheck, AlertCircle, FileCode, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface AccountsViewProps {
  accounts: AccountItem[];
  user: UserProfile;
  onOpenAddModal: (mode: 'phone' | 'session') => void;
  onDeleteAccount: (accountId: number) => Promise<void>;
  onGoToSub: () => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  user,
  onOpenAddModal,
  onDeleteAccount,
  onGoToSub,
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const plan = SUBSCRIPTION_PLANS[user.sub_plan] || SUBSCRIPTION_PLANS.free;
  const isLimitReached = accounts.length >= plan.max_accounts;

  const handleDelete = async (account: AccountItem) => {
    triggerHaptic('warning');
    if (confirm(`Удалить аккаунт ${account.phone}? Он будет отключен от рассылок.`)) {
      setDeletingId(account.id);
      try {
        await onDeleteAccount(account.id);
        triggerHaptic('success');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Top Banner / Limit Tracker */}
      <div className="apple-glass-card rounded-3xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Телеграм Аккаунты</h2>
            <p className="text-xs text-slate-400">
              Лимит: <span className="font-semibold text-white">{accounts.length}</span> из {plan.max_accounts} аккаунтов
            </p>
          </div>
        </div>

        {isLimitReached && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onGoToSub();
            }}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1 active:scale-95 transition-transform"
          >
            <Sparkles className="w-3 h-3" />
            Лимит
          </button>
        )}
      </div>

      {/* BIG PRIMARY "ДОБАВИТЬ АККАУНТ" BUTTON */}
      <div className="space-y-2">
        <button
          onClick={() => {
            if (isLimitReached) {
              triggerHaptic('error');
              alert(`На вашем тарифе ${plan.name} можно добавить максимум ${plan.max_accounts} акк. Перейдите во вкладку «Подписка» для расширения!`);
              return;
            }
            triggerHaptic('medium');
            onOpenAddModal('phone');
          }}
          className={`w-full py-3.5 px-5 rounded-3xl flex items-center justify-center gap-2.5 font-bold text-sm tracking-wide shadow-xl transition-all duration-200 active:scale-[0.98] ${
            isLimitReached
              ? 'bg-slate-800/80 text-slate-400 border border-white/5 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-blue-600/30 border border-blue-400/30 hover:brightness-110'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <span>Добавить аккаунт (По номеру)</span>
        </button>

        {/* Secondary option: Add by session */}
        <button
          onClick={() => {
            if (isLimitReached) {
              triggerHaptic('error');
              alert(`На вашем тарифе ${plan.name} можно добавить максимум ${plan.max_accounts} акк.`);
              return;
            }
            triggerHaptic('light');
            onOpenAddModal('session');
          }}
          className="w-full py-2.5 px-4 rounded-2xl apple-glass-button text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-2 border-white/10 active:scale-95 transition-all"
        >
          <FileCode className="w-3.5 h-3.5 text-blue-400" />
          <span>Импорт готовой StringSession (.session)</span>
        </button>
      </div>

      {/* ACCOUNTS LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Подключенные номера ({accounts.length})
          </h3>
          <span className="text-[11px] text-slate-500">Синхронизировано с ботом</span>
        </div>

        {accounts.length === 0 ? (
          <div className="apple-glass-card rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Нет подключенных аккаунтов</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Нажмите большую кнопку выше, чтобы войти в Telegram по номеру телефона или импортировать session.
              </p>
            </div>
          </div>
        ) : (
          accounts.map((acc) => {
            const isDeleting = deletingId === acc.id;
            const isBanned = acc.status === 'banned';

            return (
              <div
                key={acc.id}
                className="apple-glass-card rounded-3xl p-4 flex items-center justify-between gap-3 group hover:border-white/20 transition-all"
              >
                {/* Account info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    isBanned
                      ? 'bg-rose-500/20 border border-rose-500/30 text-rose-400'
                      : 'bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 border border-blue-400/30 text-blue-300'
                  }`}>
                    <Smartphone className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white tracking-wide font-mono truncate">
                        {acc.phone}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        isBanned
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isBanned ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
                        {isBanned ? 'Бан' : 'Активен'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="text-[11px]">ID: {acc.id}</span>
                      {acc.first_name && (
                        <>
                          <span>•</span>
                          <span className="truncate text-slate-300 text-[11px]">{acc.first_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(acc)}
                  disabled={isDeleting}
                  className="w-9 h-9 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
                  title="Удалить аккаунт"
                >
                  <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Security & Anti-ban info */}
      <div className="apple-glass rounded-3xl p-4 text-xs text-slate-400 space-y-2 border-white/5">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Безопасность сессий и Telethon:</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Все аккаунты сохраняются в зашифрованной StringSession. При рассылке бот автоматически ротирует выбранные аккаунты, имитирует задержки человека и защищает от FloodWait.
        </p>
      </div>
    </div>
  );
};
