import React, { useEffect, useMemo, useState } from 'react';
import { X, ListTodo, User, Briefcase, Folder, Sun, Star, Plus, Pencil } from 'lucide-react';
import { useTodoContext, DEFAULT_LIST } from '../context/TodoContext';
import { ListModal } from './ListModal';
import type { TodoList, CreateTodoListInput } from '../types/todo';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const LUCIDE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  ListTodo,
  User,
  Briefcase,
  Sun,
  Star,
  Folder,
};

export const renderListIcon = (
  iconName: string,
  isSelected: boolean = false,
  customClassName?: string
) => {
  const defaultClass = isSelected
    ? iconName === 'Star'
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-blue-600 dark:text-blue-400'
    : iconName === 'Star'
    ? 'text-rose-500 dark:text-rose-400'
    : 'text-slate-500 dark:text-neutral-400 group-hover:text-slate-700 dark:group-hover:text-neutral-200';

  const iconClass = `w-5 h-5 flex-shrink-0 ${customClassName ?? defaultClass}`;

  const IconComp = LUCIDE_ICONS[iconName];
  if (IconComp) {
    return <IconComp className={iconClass} />;
  }

  if (iconName) {
    return (
      <span className="text-lg flex-shrink-0 leading-none" role="img" aria-label="list icon">
        {iconName}
      </span>
    );
  }

  return <Folder className={iconClass} />;
};

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({ isOpen, onClose }) => {
  const { tasks, lists, currentList, setCurrentList, addList, updateList, deleteList } =
    useTodoContext();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [targetList, setTargetList] = useState<TodoList | null>(null);

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
    // 'Important' smart list aggregates all active starred tasks across lists
    counts['important'] = tasks.filter((t) => !t.completed && Boolean(t.isImportant)).length;
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

  const handleSave = (data: Required<CreateTodoListInput>) => {
    if (modalMode === 'create') {
      const newList = addList(data);
      setCurrentList(newList);
      setIsModalOpen(false);
      onClose();
    } else if (targetList) {
      updateList(targetList.id, data);
      setIsModalOpen(false);
    }
  };

  const handleDelete = (listId: string) => {
    deleteList(listId);
    setIsModalOpen(false);
  };

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
              <div
                key={list.id}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-colors group ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800 font-medium'
                }`}
              >
                <button
                  type="button"
                  data-testid={`list-item-${list.id}`}
                  aria-current={isSelected ? 'page' : undefined}
                  onClick={() => {
                    setCurrentList(list);
                    onClose();
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 py-1.5 cursor-pointer text-left"
                >
                  {renderListIcon(list.icon, isSelected)}
                  <span className="truncate text-sm">{list.name}</span>
                </button>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!list.isSystem && (
                    <button
                      type="button"
                      aria-label={`Edit ${list.name} list`}
                      data-testid={`edit-list-${list.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetList(list);
                        setModalMode('edit');
                        setIsModalOpen(true);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                </div>
              </div>
            );
          })}
        </div>

        {/* New List Action Button */}
        <div className="p-3 border-t border-slate-100 dark:border-neutral-800 mt-auto">
          <button
            type="button"
            data-testid="add-list-btn"
            aria-label="+ New List"
            onClick={() => {
              setModalMode('create');
              setTargetList(null);
              setIsModalOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold text-sm transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>+ New List</span>
          </button>
        </div>
      </nav>

      {/* List Creation / Editing Dialog */}
      <ListModal
        isOpen={isModalOpen}
        mode={modalMode}
        list={targetList}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
};
