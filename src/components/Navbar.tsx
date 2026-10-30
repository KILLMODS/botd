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
      label: 'Тарифы',
      icon: CreditCard,
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-5 pt-2 px-4 pointer-events-none flex justify-center safe-bottom">
      <nav className="pointer-events-auto bg-[#16171d]/85 backdrop-blur-3xl border border-white/[0.12] rounded-full p-1.5 flex items-center justify-between max-w-sm w-full relative shadow-[0_16px_36px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.18)]">
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
              className={`relative flex-1 py-2 rounded-full flex flex-col items-center justify-center transition-colors duration-200 z-10 select-none ${
                isActive ? 'text-white font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 32,
                  }}
                  className="absolute inset-0 bg-white/[0.14] border border-white/[0.18] rounded-full -z-10 shadow-sm"
                />
              )}

              <Icon className={`w-4 h-4 mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110 text-blue-400' : ''}`} />
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
