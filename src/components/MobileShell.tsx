import React, { useState } from 'react';
import { Menu, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useTodoContext } from '../context/TodoContext';
import { TaskList } from './TaskList';
import { QuickAddBar } from './QuickAddBar';
import { NavigationDrawer, renderListIcon } from './NavigationDrawer';
import { ListModal } from './ListModal';
import { getThemeGradient } from '../constants/theme';

interface MobileShellProps {
  children?: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const { currentList, currentTasks, updateList, deleteList } = useTodoContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const activeCount = currentTasks.filter((t) => !t.completed).length;

  return (
    <div
      data-testid="mobile-shell"
      className="w-full h-full min-h-screen md:min-h-0 flex flex-col bg-slate-100 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 overflow-hidden select-none relative"
    >
      {/* Top Header / App Bar */}
      <header
        data-testid="mobile-shell-header"
        data-theme={currentList.colorTheme}
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
          <div className="flex items-center space-x-2 relative">
            <span
              data-testid="current-list-pill"
              className="text-xs font-medium tracking-wide bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-sm"
            >
              {currentList.name}
            </span>
            <button
              type="button"
              aria-label="More list options"
              data-testid="list-options-btn"
              disabled={currentList.isSystem}
              onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
              className={`p-2 -mr-2 rounded-full hover:bg-white/20 active:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer ${
                currentList.isSystem ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>

            {/* Options Dropdown Menu for Custom Lists */}
            {isOptionsMenuOpen && !currentList.isSystem && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsOptionsMenuOpen(false)}
                />
                <div
                  data-testid="list-options-menu"
                  className="absolute right-0 top-10 w-44 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-slate-100 dark:border-neutral-700 py-1.5 z-30 text-slate-800 dark:text-neutral-100 animate-in fade-in duration-150"
                >
                  <button
                    type="button"
                    data-testid="edit-list-menu-item"
                    aria-label="Edit list settings"
                    onClick={() => {
                      setIsOptionsMenuOpen(false);
                      setIsEditModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer text-left"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                    <span>Edit list settings</span>
                  </button>
                  <button
                    type="button"
                    data-testid="delete-list-menu-item"
                    aria-label="Delete list"
                    onClick={() => {
                      setIsOptionsMenuOpen(false);
                      deleteList(currentList.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete list</span>
                  </button>
                </div>
              </>
            )}
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

      {/* Edit List Modal from Header Options */}
      <ListModal
        isOpen={isEditModalOpen}
        mode="edit"
        list={currentList}
        onClose={() => setIsEditModalOpen(false)}
        onSave={(data) => {
          updateList(currentList.id, data);
          setIsEditModalOpen(false);
        }}
        onDelete={(id) => {
          deleteList(id);
          setIsEditModalOpen(false);
        }}
      />
    </div>
  );
};
