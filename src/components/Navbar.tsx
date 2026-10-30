import React from 'react';
import { User, Smartphone, Layers, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import { triggerHaptic } from '../services/telegram';

export type TabType = 'profile' | 'accounts' | 'tasks' | 'subscription';

interface NavbarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  accountsCount?: number;
  tasksCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onChangeTab,
}) => {
  const tabs = [
    {
      id: 'profile' as TabType,
      label: 'Профиль',
      icon: User,
    },
    {
      id: 'accounts' as TabType,
      label: 'Аккаунты',
      icon: Smartphone,
    },
    {
      id: 'tasks' as TabType,
      label: 'Задачи',
      icon: Layers,
    },
    {
      id: 'subscription' as TabType,
      label: 'Подписка',
      icon: CreditCard,
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-6 pt-2 px-4 pointer-events-none flex justify-center">
      <nav className="pointer-events-auto bg-neutral-900/90 backdrop-blur-2xl border border-neutral-800 rounded-full p-1 flex items-center justify-between max-w-sm w-full relative">
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
              className={`relative flex-1 py-2 rounded-full flex flex-col items-center justify-center transition-colors duration-150 z-10 select-none ${
                isActive ? 'text-black font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 30,
                  }}
                  className="absolute inset-0 bg-white rounded-full -z-10"
                />
              )}

              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] tracking-tight leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
