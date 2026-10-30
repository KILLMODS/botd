import React from 'react';
import { User, Smartphone, Send, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../services/telegram';

export type TabType = 'profile' | 'accounts' | 'tasks' | 'subscription';

interface NavbarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  accountsCount: number;
  tasksCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
  accountsCount,
  tasksCount
}) => {
  const tabs = [
    {
      id: 'profile' as TabType,
      label: 'Профиль',
      icon: User,
      badge: null
    },
    {
      id: 'accounts' as TabType,
      label: 'Аккаунты',
      icon: Smartphone,
      badge: accountsCount > 0 ? accountsCount : null
    },
    {
      id: 'tasks' as TabType,
      label: 'Задачи',
      icon: Send,
      badge: tasksCount > 0 ? tasksCount : null
    },
    {
      id: 'subscription' as TabType,
      label: 'Подписка',
      icon: Sparkles,
      badge: '★'
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-5 pt-2 px-4 pointer-events-none flex justify-center">
      <nav className="pointer-events-auto apple-glass-dock rounded-full px-2 py-1.5 flex items-center gap-1 shadow-2xl max-w-sm w-full justify-between">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('selection');
                onChangeTab(tab.id);
              }}
              className={`relative flex-1 py-2 px-2.5 rounded-full flex flex-col items-center justify-center transition-all duration-300 group ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active pill background with glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/40 via-indigo-500/40 to-blue-600/40 border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)] -z-10 animate-in fade-in zoom-in-95 duration-200" />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-blue-400' : 'group-hover:scale-105'
                  }`}
                />
                {tab.badge !== null && (
                  <span className={`absolute -top-1.5 -right-3 px-1.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center leading-none ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-sm shadow-blue-500/50'
                      : 'bg-white/15 text-slate-300'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </div>

              <span className={`text-[11px] font-medium tracking-tight mt-1 transition-colors ${
                isActive ? 'text-white font-semibold' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
