import React from 'react';
import { Menu, MoreVertical, Sun, Sparkles, Plus } from 'lucide-react';

interface MobileShellProps {
  children?: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      data-testid="mobile-shell"
      className="w-full h-full min-h-screen md:min-h-0 flex flex-col bg-slate-100 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 overflow-hidden select-none"
    >
      {/* Top Header / App Bar */}
      <header className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white px-4 pt-4 pb-6 shadow-md transition-colors">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            aria-label="Open navigation menu"
            className="p-2 -ml-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium tracking-wide bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              Mobile Preview
            </span>
            <button
              type="button"
              aria-label="More list options"
              className="p-2 -mr-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sun className="w-6 h-6 text-amber-300 fill-amber-300" />
              My Day
            </h1>
          </div>
          <p className="text-xs font-normal text-blue-100 tracking-wide">{today}</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {children ? (
          children
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-neutral-200">
              Focus on your day
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mt-1 leading-relaxed">
              Get things done with My Day, a list that refreshes every day.
            </p>
          </div>
        )}
      </main>

      {/* Bottom Quick-Add Dock Placeholder */}
      <footer className="p-3 bg-white/80 dark:bg-neutral-850 backdrop-blur border-t border-slate-200 dark:border-neutral-800">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-100 dark:bg-neutral-800 rounded-xl text-slate-500 dark:text-neutral-400 border border-slate-200/60 dark:border-neutral-700/60 shadow-xs">
          <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="text-sm font-normal">Add a task</span>
        </div>
      </footer>
    </div>
  );
};
