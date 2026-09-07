import React, { useState } from 'react';
import { Menu, MoreVertical } from 'lucide-react';
import { useTodoContext } from '../context/TodoContext';
import { TaskList } from './TaskList';
import { QuickAddBar } from './QuickAddBar';
import { NavigationDrawer, renderListIcon } from './NavigationDrawer';

interface MobileShellProps {
  children?: React.ReactNode;
}

const getThemeGradient = (colorTheme?: string) => {
  switch (colorTheme) {
    case 'purple':
      return 'from-purple-600 via-fuchsia-600 to-pink-500';
    case 'emerald':
    case 'green':
      return 'from-emerald-600 via-teal-600 to-cyan-500';
    case 'blue':
    default:
      return 'from-blue-600 via-indigo-600 to-sky-500';
  }
};

export const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const { currentList, currentTasks } = useTodoContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const activeCount = currentTasks.filter((t) => !t.completed).length;

  return (
    <div
      data-testid="mobile-shell"
      className="w-full h-full min-h-screen md:min-h-0 flex flex-col bg-slate-100 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 overflow-hidden select-none relative"
    >
      {/* Top Header / App Bar */}
      <header
        className={`relative bg-gradient-to-r ${getThemeGradient(
          currentList.colorTheme
        )} text-white px-4 pt-4 pb-6 shadow-md transition-all duration-300`}
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            aria-label="Open navigation menu"
            data-testid="hamburger-menu-btn"
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 -ml-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium tracking-wide bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              {currentList.name}
            </span>
            <button
              type="button"
              aria-label="More list options"
              className="p-2 -mr-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="text-white flex items-center justify-center">
                {renderListIcon(currentList.icon, false)}
              </span>
              {currentList.name}
            </h1>
          </div>
          <p className="text-xs font-normal text-blue-100 tracking-wide">
            {activeCount} active, {currentTasks.length} total
          </p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {children ? children : <TaskList />}
      </main>

      {/* Bottom Quick-Add Dock */}
      <QuickAddBar />

      {/* Slide-over Navigation Drawer */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};
