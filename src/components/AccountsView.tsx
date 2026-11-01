import React, { useState } from 'react';
import { AccountItem, UserProfile } from '../types';
import { SUBSCRIPTION_PLANS } from '../services/api';
import { Plus, Trash2, Smartphone, Search, ShieldCheck, AlertCircle } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

interface AccountsViewProps {
  accounts: AccountItem[];
  user: UserProfile;
  onOpenAddModal: () => void;
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
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredAccounts = accounts.filter(acc => 
    acc.phone.toLowerCase().includes(searchQuery.toLowerCase()) || 
    acc.id.toString().includes(searchQuery) ||
    (acc.first_name && acc.first_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h2 className="text-[17px] font-bold text-white tracking-tight">Подключенные аккаунты</h2>
          <p className="text-[12px] text-neutral-400">
            {accounts.length} из {plan.max_accounts} по тарифу {plan.name}
          </p>
        </div>

        {isLimitReached ? (
          <button
            onClick={() => {
              triggerHaptic('light');
              onGoToSub();
            }}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 transition-all active:scale-95"
          >
            Лимит тарифа
          </button>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
            Свободно: {Math.max(0, plan.max_accounts - accounts.length)}
          </span>
        )}
      </div>

      {/* Primary Action Button: "Добавить аккаунт" (without (SMS), no string session) */}
      <div>
        <button
          onClick={() => {
            if (isLimitReached) {
              triggerHaptic('error');
              alert(`На тарифе ${plan.name} доступно максимум ${plan.max_accounts} акк. Смените тариф на Pro во вкладке «Тарифы»!`);
              return;
            }
            triggerHaptic('medium');
            onOpenAddModal();
          }}
          className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-sm tracking-wide transition-all shadow-[0_10px_25px_rgba(16,185,129,0.25),inset_0_1px_0_0_rgba(255,255,255,0.25)] ${
            isLimitReached
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white active:scale-[0.98]'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>Добавить аккаунт</span>
        </button>
      </div>

      {/* Search Input when accounts count > 2 */}
      {accounts.length > 2 && (
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по номеру телефона..."
            className="w-full bg-[#181920]/80 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      )}

      {/* Accounts List */}
      <div className="space-y-2.5">
        {filteredAccounts.length === 0 ? (
          <div className="liquid-glass-card p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-neutral-400">
              <Smartphone className="w-7 h-7" />
            </div>
            <h4 className="text-[16px] font-bold text-white">
              {accounts.length === 0 ? 'Нет подключенных профилей' : 'Ничего не найдено'}
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
              {accounts.length === 0 
                ? 'Нажмите «Добавить аккаунт» выше для быстрой и безопасной авторизации в Telegram.'
                : 'Попробуйте изменить поисковый запрос.'}
            </p>
          </div>
        ) : (
          filteredAccounts.map((acc) => {
            const isDeleting = deletingId === acc.id;
            return (
              <div
                key={acc.id}
                className="liquid-glass-card p-3.5 flex items-center justify-between transition-all hover:bg-white/[0.06]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center flex-shrink-0 text-blue-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white font-mono">
                        {acc.phone}
                      </span>
                      {acc.has_telegram_premium && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-500 text-black">
                          Premium ⭐
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          acc.status === 'active' ? 'bg-emerald-400' :
                          acc.status === 'spamblock' ? 'bg-amber-400' :
                          'bg-red-400'
                        }`} />
                        <span>{acc.status === 'active' ? 'Активен' : acc.status === 'spamblock' ? 'Спам-блок' : acc.status}</span>
                      </span>
                      {acc.first_name && (
                        <>
                          <span>•</span>
                          <span>{acc.first_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(acc)}
                  className="w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-red-500/20 border border-white/[0.08] hover:border-red-500/30 flex items-center justify-center text-neutral-400 hover:text-red-400 transition-colors active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
