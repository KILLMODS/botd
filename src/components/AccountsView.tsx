import React, { useState } from 'react';
import { AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { Plus, Trash2, Smartphone } from 'lucide-react';
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
          <h2 className="text-base font-semibold text-white">Аккаунты</h2>
          <p className="text-xs text-neutral-400">
            Подключено {accounts.length} из {plan.max_accounts}
          </p>
        </div>

        {isLimitReached && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onGoToSub();
            }}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
          >
            Лимит тарифа
          </button>
        )}
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          onClick={() => {
            if (isLimitReached) {
              triggerHaptic('error');
              alert(`На тарифе ${plan.name} доступно максимум ${plan.max_accounts} акк. Смените тариф во вкладке «Подписка»!`);
              return;
            }
            triggerHaptic('medium');
            onOpenAddModal('phone');
          }}
          className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium text-xs tracking-wide transition-all ${
            isLimitReached
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : 'bg-white text-black hover:bg-neutral-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Добавить аккаунт</span>
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
          className="py-3 px-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-medium text-neutral-300 hover:text-white flex items-center justify-center gap-2 transition-all"
        >
          <span>Импорт StringSession</span>
        </button>
      </div>

      {/* Accounts List */}
      <div className="space-y-2">
        {accounts.length === 0 ? (
          <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-8 text-center space-y-2">
            <Smartphone className="w-8 h-8 text-neutral-600 mx-auto" />
            <h4 className="text-sm font-medium text-white">Нет подключенных аккаунтов</h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto">
              Нажмите «Добавить аккаунт» для входа по номеру или импорта Telethon session.
            </p>
          </div>
        ) : (
          accounts.map((acc) => {
            const isDeleting = deletingId === acc.id;
            const isBanned = acc.status === 'banned';

            return (
              <div
                key={acc.id}
                className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center flex-shrink-0 text-neutral-300">
                    <Smartphone className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-white truncate">
                        {acc.phone}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        isBanned ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-800 text-emerald-400'
                      }`}>
                        {isBanned ? 'Бан' : 'Активен'}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      ID #{acc.id}
                    </span>
                  </div>
                </div>

                <button
                  disabled={isDeleting}
                  onClick={() => handleDelete(acc)}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
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
