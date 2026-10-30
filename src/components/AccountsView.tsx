import React, { useState } from 'react';
import { AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { Plus, Trash2, Smartphone, Key } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface AccountsViewProps {
  accounts: AccountItem[];
  user: UserProfile;
  onOpenAddModal: (mode?: 'select' | 'phone' | 'session') => void;
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
    if (confirm(`Удалить аккаунт ${account.phone}?`)) {
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
    <div className="space-y-4 pb-28">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h2 className="text-[17px] font-semibold text-white tracking-tight">Подключенные аккаунты</h2>
          <p className="text-[12px] text-neutral-400">
            {accounts.length} из {plan.max_accounts} аккаунтов
          </p>
        </div>

        {isLimitReached && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onGoToSub();
            }}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-all"
          >
            Лимит тарифа
          </button>
        )}
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          onClick={() => {
            if (isLimitReached) {
              triggerHaptic('error');
              alert(`На тарифе ${plan.name} доступно максимум ${plan.max_accounts} акк. Смените тариф во вкладке «Подписка»!`);
              return;
            }
            triggerHaptic('medium');
            onOpenAddModal('select');
          }}
          className={`py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-xs tracking-wide transition-all shadow-md ${
            isLimitReached
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Добавить аккаунт (SMS)</span>
        </button>

        <button
          onClick={() => {
            if (isLimitReached) {
              triggerHaptic('error');
              alert(`На тарифе ${plan.name} доступно максимум ${plan.max_accounts} акк.`);
              return;
            }
            triggerHaptic('light');
            onOpenAddModal('session');
          }}
          className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
        >
          <Key className="w-4 h-4" />
          <span>Импорт StringSession</span>
        </button>
      </div>

      {/* Accounts List */}
      <div className="space-y-2.5">
        {accounts.length === 0 ? (
          <div className="apple-group-card p-8 text-center space-y-2">
            <Smartphone className="w-10 h-10 text-neutral-500 mx-auto" />
            <h4 className="text-[15px] font-semibold text-white">Нет подключенных профилей</h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
              Нажмите «Добавить аккаунт» для безопасной авторизации или импорта Telethon session.
            </p>
          </div>
        ) : (
          accounts.map((acc) => {
            const isDeleting = deletingId === acc.id;
            const isBanned = acc.status === 'banned';

            return (
              <div
                key={acc.id}
                className="apple-group-card p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-neutral-300">
                    <Smartphone className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-white truncate">
                        {acc.phone}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isBanned
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {isBanned ? 'Бан' : 'Активен'}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      ID #{acc.id}
                    </span>
                  </div>
                </div>

                <button
                  disabled={isDeleting}
                  onClick={() => handleDelete(acc)}
                  className="px-3 py-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
