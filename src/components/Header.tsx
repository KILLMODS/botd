import React from 'react';
import { RefreshCw, User as UserIcon } from 'lucide-react';
import { UserProfile } from '../types';
import { triggerHaptic } from '../services/telegram';

interface HeaderProps {
  user: UserProfile;
  isSyncing: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isSyncing,
  onRefresh,
}) => {
  return (
    <header className="sticky top-0 z-30 px-4 pt-3 pb-2.5 backdrop-blur-2xl bg-black/70 border-b border-white/10">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Avatar & Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-neutral-900 flex items-center justify-center flex-shrink-0 shadow-sm">
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
              <UserIcon className="w-5 h-5 text-neutral-300" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                {user.first_name || 'TG Broadcaster'}
              </span>
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-white text-black">
                {user.sub_plan}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
              <span className="text-[11px] font-mono">ID: {user.user_id}</span>
              {user.username && (
                <>
                  <span className="text-neutral-600">•</span>
                  <span className="text-[11px] text-neutral-300">@{user.username}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Refresh action */}
        <button
          onClick={() => {
            triggerHaptic('light');
            onRefresh();
          }}
          disabled={isSyncing}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all"
          title="Синхронизировать"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-white' : ''}`} />
        </button>
      </div>
    </header>
  );
};
