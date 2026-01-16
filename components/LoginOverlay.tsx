
import React from 'react';
import { User, UserRole } from '../types';

interface LoginOverlayProps {
  onLogin: (user: User) => void;
}

const LoginOverlay: React.FC<LoginOverlayProps> = ({ onLogin }) => {
  const PRESET_USERS: User[] = [
    { id: 'u1', email: 'manager@company.com', name: 'Alex Manager', role: UserRole.MANAGER },
    { id: 'u2', email: 'user@company.com', name: 'Jordan User', role: UserRole.USER }
  ];

  return (
    <div className="fixed inset-0 bg-valuenova-bg z-[100] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-6">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">CampaignOS</h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs">Local Deployment • v2.5</p>
        </div>

        <div className="bg-valuenova-surface p-8 rounded-3xl border border-valuenova-border shadow-2xl">
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6">Select Identity</h2>
          <div className="space-y-4">
            {PRESET_USERS.map(user => (
              <button
                key={user.id}
                onClick={() => onLogin(user)}
                className="w-full group relative flex items-center gap-4 p-4 rounded-2xl border border-valuenova-border hover:border-valuenova-accent bg-valuenova-bg transition-all hover:scale-[1.02] text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tight">{user.name}</p>
                  <p className="text-xs text-valuenova-muted">{user.role}</p>
                </div>
                <div className="absolute right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-valuenova-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-valuenova-border">
             <p className="text-[10px] font-black text-valuenova-muted uppercase tracking-[0.3em] leading-relaxed">
               This is a local instance.<br/>No data leaves your device.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginOverlay;
