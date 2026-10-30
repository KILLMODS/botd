import React, { useState } from 'react';
import { AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { Plus, Trash2, Smartphone, FileCode } from 'lucide-react';
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
    <div className="space-y-4 pb-28 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-neutral-900/70 border border-white/15 rounded-3xl p-4 flex items-center justify-between backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Аккаунты Telegram</h2>
            <p className="text-xs text-neutral-400">
              Подключено: <span className="font-mono text-white font-bold">{accounts.length}</span> из {plan.max_accounts}
            </p>
          </div>
        </div>

        {isLimitReached && (
          <button
            onClick={() => {
              triggerHaptic('light');
              onGoToSub();
            }}
            className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-white text-black active:scale-95 transition-transform"
          >
            Лимит тарифа
          </button>
        )}
      </div>

      {/* Primary Actions */}
      <div className="space-y-2">
        <button
          onClick={() => {
            if (isLimitReached) {
              triggerHaptic('error');
              alert(`На вашем тарифе ${plan.name} доступно максимум ${plan.max_accounts} акк. Перейдите во вкладку «Подписка» для расширения!`);
              return;
            }
            triggerHaptic('medium');
            onOpenAddModal('phone');
          }}
          className={`w-full py-3.5 px-5 rounded-3xl flex items-center justify-center gap-2.5 font-bold text-sm tracking-wide transition-all duration-200 active:scale-[0.98] ${
            isLimitReached
              ? 'bg-neutral-800 text-neutral-500 border border-white/5 cursor-not-allowed'
              : 'bg-white text-black hover:bg-neutral-200 shadow-lg'
          }`}
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Добавить аккаунт (По номеру)</span>
        </button>

        <button
          onClick={() => {
            if (isLimitReached) {
              triggerHaptic('error');
              alert(`На вашем тарифе ${plan.name} доступно максимум ${plan.max_accounts} акк.`);
              return;
            }
            triggerHaptic('light');
            onOpenAddModal('session');
          }}
          className="w-full py-2.5 px-4 rounded-2xl bg-neutral-900 border border-white/10 hover:border-white/20 text-xs font-semibold text-neutral-300 hover:text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <FileCode className="w-4 h-4 text-white" />
          <span>Импорт готовой StringSession</span>
        </button>
      </div>

      {/* Accounts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Список номеров ({accounts.length})
          </h3>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-neutral-900/60 border border-white/10 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Нет подключенных аккаунтов</h4>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto mt-1">
                Нажмите кнопку «Добавить аккаунт» выше для входа по номеру телефона или импорта StringSession.
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
                className="bg-neutral-900/70 border border-white/15 rounded-3xl p-4 flex items-center justify-between gap-3 backdrop-blur-2xl"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 text-white">
                    <Smartphone className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono tracking-wide truncate">
                        {acc.phone}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isBanned ? 'bg-neutral-800 text-neutral-400' : 'bg-white text-black'
                      }`}>
                        {isBanned ? 'Бан' : 'Активен'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                      <span className="font-mono text-[11px]">ID: {acc.id}</span>
                      {acc.first_name && (
                        <>
                          <span>•</span>
                          <span className="truncate text-neutral-300 text-[11px]">{acc.first_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(acc)}
                  disabled={isDeleting}
                  className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-400 hover:text-white flex items-center justify-center active:scale-90 transition-all flex-shrink-0"
                  title="Удалить"
                >
                  <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
