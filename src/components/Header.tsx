import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  user: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({ user }) => {
  return (
    <header className="sticky top-0 z-30 px-4 py-3 bg-black/60 backdrop-blur-2xl border-b border-white/[0.08] select-none">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white/[0.05] flex items-center justify-center flex-shrink-0">
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
      </div>
    </header>
  );
};
