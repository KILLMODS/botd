import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';
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
    <header className="sticky top-0 z-30 px-4 pt-3 pb-2 backdrop-blur-xl bg-[#090a0f]/60 border-b border-white/5">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[1px] shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-[#0d0f17] rounded-2xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">TG Broadcaster</span>
              <span className="px-1.5 py-0.2 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Mini App
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px]">ID: {user.user_id}</span>
              <span className="text-slate-600">•</span>
              <span className="capitalize text-blue-400 font-medium text-[11px]">{user.sub_plan}</span>
            </div>
          </div>
        </div>

        {/* Right: Refresh action */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              triggerHaptic('light');
              onRefresh();
            }}
            disabled={isSyncing}
            className="w-8 h-8 rounded-full apple-glass-button flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition-transform"
            title="Обновить"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
