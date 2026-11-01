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
    <div className="fixed bottom-0 left-0 right-0 z-40 pb-6 pt-3 px-4 pointer-events-none flex justify-center safe-bottom">
      <nav className="pointer-events-auto bg-[#1c1c1e]/85 backdrop-blur-2xl border border-white/12 rounded-full p-2 flex items-center justify-between max-w-[480px] w-full gap-1 relative shadow-[0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              layout
              onClick={() => {
                triggerHaptic('selection');
                onChangeTab(tab.id);
              }}
              transition={{
                layout: { type: 'spring', stiffness: 400, damping: 32 }
              }}
              className={`relative py-3 px-4 rounded-full flex items-center justify-center gap-2.5 select-none transition-colors duration-200 ${
                isActive
                  ? 'flex-[2.4] text-white font-bold'
                  : 'flex-1 text-neutral-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-active-pill"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 32,
                  }}
                  className="absolute inset-0 bg-white/15 border border-white/20 rounded-full -z-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]"
                />
              )}

              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                  isActive ? 'scale-105 text-white' : 'opacity-70'
                }`}
              />

              {isActive && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 'auto' }}
                  exit={{ opacity: 0, scale: 0.9, width: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="text-[14px] font-extrabold tracking-tight whitespace-nowrap overflow-hidden text-white"
                >
                  {tab.label}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};

