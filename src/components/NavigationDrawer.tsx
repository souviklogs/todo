import React, { useEffect, useMemo } from 'react';
import { X, ListTodo, User, Briefcase, Folder, Sun, Star } from 'lucide-react';
import { useTodoContext, DEFAULT_LIST } from '../context/TodoContext';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const renderListIcon = (iconName: string, isSelected: boolean = false) => {
  const iconClass = `w-5 h-5 flex-shrink-0 ${
    isSelected
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-slate-500 dark:text-neutral-400 group-hover:text-slate-700 dark:group-hover:text-neutral-200'
  }`;

  switch (iconName) {
    case 'ListTodo':
      return <ListTodo className={iconClass} />;
    case 'User':
      return <User className={iconClass} />;
    case 'Briefcase':
      return <Briefcase className={iconClass} />;
    case 'Sun':
      return <Sun className={iconClass} />;
    case 'Star':
      return <Star className={iconClass} />;
    default:
      if (iconName && iconName.length <= 4) {
        return <span className="text-lg flex-shrink-0 leading-none">{iconName}</span>;
      }
      return <Folder className={iconClass} />;
  }
};

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ isOpen, onClose }) => {
  const { tasks, lists, currentList, setCurrentList } = useTodoContext();

  const activeCountsByList = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const list of lists) {
      counts[list.id] = 0;
    }
    for (const task of tasks) {
      if (!task.completed) {
        const taskListId = task.listId ?? DEFAULT_LIST.id;
        counts[taskListId] = (counts[taskListId] ?? 0) + 1;
      }
    }
    return counts;
  }, [tasks, lists]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid="drawer-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 z-40 transition-opacity backdrop-blur-xs cursor-pointer animate-in fade-in duration-200"
      />

      {/* Slide-over Navigation Drawer */}
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        data-testid="navigation-drawer"
        className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white dark:bg-neutral-900 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out animate-in slide-in-from-left duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              TD
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-neutral-100">
                Microsoft To Do
              </h2>
              <p className="text-xs text-slate-400 dark:text-neutral-500">
                Mobile Assistant
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation drawer"
            data-testid="close-drawer-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lists Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-neutral-500 uppercase">
            Lists
          </div>
          {lists.map((list) => {
            const activeCount = activeCountsByList[list.id] ?? 0;
            const isSelected = currentList.id === list.id;

            return (
              <button
                key={list.id}
                type="button"
                data-testid={`list-item-${list.id}`}
                aria-current={isSelected ? 'page' : undefined}
                onClick={() => {
                  setCurrentList(list);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-colors cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 font-medium'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {renderListIcon(list.icon, isSelected)}
                  <span className="truncate text-sm">{list.name}</span>
                </div>
                <span
                  data-testid={`list-count-${list.id}`}
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 group-hover:bg-slate-200 dark:group-hover:bg-neutral-700'
                  }`}
                >
                  {activeCount}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
