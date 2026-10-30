import React from 'react';
import { User as UserIcon, Crown } from 'lucide-react';
import { UserProfile } from '../types';
import { ADMIN_USER_IDS } from '../services/api';

interface HeaderProps {
  user: UserProfile;
  isConnected?: boolean;
  onOpenConnectionHelp?: () => void;
  onOpenAdminStats?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isConnected = false,
  onOpenConnectionHelp,
  onOpenAdminStats,
}) => {
  const isAdmin = ADMIN_USER_IDS.includes(Number(user.user_id));

  return (
    <header className="sticky top-0 z-30 px-4 py-3 bg-black/80 backdrop-blur-xl border-b border-neutral-900 select-none">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border border-neutral-800 overflow-hidden bg-neutral-900 flex items-center justify-center flex-shrink-0">
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
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white leading-tight">
                {user.first_name || 'TG Broadcaster'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider rounded-md bg-neutral-800 text-neutral-200">
                {user.sub_plan}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono mt-0.5">
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

        {/* Right side buttons: Admin & Connection */}
        <div className="flex items-center gap-1.5">
          {isAdmin && onOpenAdminStats && (
            <button
              onClick={onOpenAdminStats}
              title="Статистика администратора"
              className="px-2 py-1 rounded-full border border-purple-500/40 bg-purple-950/30 text-[11px] font-medium text-purple-300 hover:text-white hover:border-purple-500 transition-colors flex items-center gap-1"
            >
              <Crown className="w-3 h-3 text-purple-400" />
              <span>Админ</span>
            </button>
          )}

          {onOpenConnectionHelp && (
            <button
              onClick={onOpenConnectionHelp}
              className="px-2.5 py-1 rounded-full border border-neutral-800 bg-neutral-900/60 text-[11px] font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors flex items-center gap-1.5"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400' : 'bg-neutral-600'
                }`}
              />
              <span>{isConnected ? 'online' : 'bothost'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
