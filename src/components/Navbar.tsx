import React from 'react';
import { User, Smartphone, Send, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
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
      <nav className="pointer-events-auto bg-neutral-900/80 backdrop-blur-3xl border border-white/15 rounded-full p-1.5 flex items-center justify-between max-w-sm w-full shadow-[0_12px_40px_rgba(0,0,0,0.8)] relative">
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
              className={`relative flex-1 py-2 px-1 rounded-full flex flex-col items-center justify-center transition-colors duration-200 z-10 select-none ${
                isActive ? 'text-black font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {/* Smooth Sliding Pill Indicator */}
              {isActive && (
                <motion.div
                  layoutId="navbar-indicator"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                    mass: 0.8
                  }}
                  className="absolute inset-0 bg-white rounded-full shadow-[0_2px_12px_rgba(255,255,255,0.4)] -z-10"
                />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-105 text-black' : 'text-neutral-400'
                  }`}
                />
                {tab.badge !== null && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 px-1.5 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center leading-none ${
                      isActive
                        ? 'bg-black text-white'
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                  isActive ? 'text-black font-bold' : 'text-neutral-400'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
