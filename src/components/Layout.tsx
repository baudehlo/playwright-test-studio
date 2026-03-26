import React from 'react';
import { FlaskConical, Settings as SettingsIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: 'main' | 'settings';
  onNavigate: (page: 'main' | 'settings') => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-violet-400" />
          <span className="font-semibold text-sm text-slate-100">Playwright Test Studio</span>
        </div>
        <nav className="flex gap-1">
          <button
            onClick={() => onNavigate('main')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              currentPage === 'main'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            Tests
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
              currentPage === 'settings'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            <SettingsIcon className="w-3 h-3" />
            Settings
          </button>
        </nav>
      </header>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
