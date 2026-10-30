import React from 'react';
import { User as UserIcon, Crown, Settings } from 'lucide-react';
import { UserProfile } from '../types';
import { ADMIN_USER_IDS } from '../services/api';
import { triggerHaptic } from '../services/telegram';

interface HeaderProps {
  user: UserProfile;
  isConnected?: boolean;
  onOpenConnectionHelp?: () => void;
  onOpenAdminStats?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isConnected = false,
  onOpenConnectionHelp,
  onOpenAdminStats,
  onOpenSettings,
}) => {
  const isAdmin = ADMIN_USER_IDS.includes(Number(user.user_id));

  return (
    <header className="sticky top-0 z-30 px-4 py-3 bg-black/60 backdrop-blur-2xl border-b border-white/[0.08] select-none">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border border-white/[0.12] overflow-hidden bg-white/[0.05] flex items-center justify-center flex-shrink-0 shadow-inner">
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.first_name || 'User'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <UserIcon className="w-4 h-4 text-neutral-400" />
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-white leading-tight tracking-tight">
                {user.first_name || 'TG Broadcaster'}
              </span>
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full ${
                user.sub_plan === 'premium' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                user.sub_plan === 'pro' ? 'bg-blue-400/20 text-blue-300 border border-blue-400/30' :
                'bg-white/10 text-neutral-300'
              }`}>
                {user.sub_plan}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono mt-0.5">
              <span>ID: {user.user_id}</span>
              {user.username && (
                <>
                  <span>•</span>
                  <span>@{user.username}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side buttons: Admin, Connection & Settings */}
        <div className="flex items-center gap-2">
          {isAdmin && onOpenAdminStats && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenAdminStats();
              }}
              title="Панель администратора"
              className="px-2.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-[11px] font-medium text-purple-300 hover:text-white hover:border-purple-500/50 transition-all flex items-center gap-1 active:scale-95"
            >
              <Crown className="w-3.5 h-3.5 text-purple-400" />
              <span>Админ</span>
            </button>
          )}

          {onOpenConnectionHelp && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenConnectionHelp();
              }}
              className="px-2.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.05] text-[11px] font-mono text-neutral-300 hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-neutral-500'
                }`}
              />
              <span>{isConnected ? 'online' : 'bothost'}</span>
            </button>
          )}

          {/* Apple iOS Settings Button */}
          {onOpenSettings && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenSettings();
              }}
              className="w-8 h-8 rounded-full border border-white/[0.1] bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-90"
              title="Настройки Apple"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
