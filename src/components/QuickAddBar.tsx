import React, { useState } from 'react';
import { Plus, Calendar, CalendarDays, Star, Sun } from 'lucide-react';
import { useTodoContext } from '../context/TodoContext';
import { getLocalDateString, getTomorrowDateString } from '../types/todo';

interface ShortcutChipProps {
  testId: string;
  label: string;
  ariaLabel: string;
  isActive: boolean;
  activeColor: 'blue' | 'amber';
  icon: React.ReactNode;
  onClick: () => void;
}

const ShortcutChip: React.FC<ShortcutChipProps> = ({
  testId,
  label,
  ariaLabel,
  isActive,
  activeColor,
  icon,
  onClick,
}) => {
  const activeClass =
    activeColor === 'blue'
      ? 'bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-600 font-semibold'
      : 'bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-600 font-semibold';

  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      data-active={isActive}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border flex-shrink-0 ${
        isActive
          ? activeClass
          : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700/80 dark:hover:bg-neutral-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

interface QuickAddAttributes {
  dueDate: 'today' | 'tomorrow' | null;
  isStarred: boolean;
  isMyDay: boolean;
}

const INITIAL_ATTRIBUTES: QuickAddAttributes = {
  dueDate: null,
  isStarred: false,
  isMyDay: false,
};

export const QuickAddBar: React.FC = () => {
  const [title, setTitle] = useState('');
  const [attributes, setAttributes] = useState<QuickAddAttributes>(INITIAL_ATTRIBUTES);
  const { addTask, selectedTask } = useTodoContext();

  if (selectedTask) {
    return null;
  }

  const handleToggleDueToday = () => {
    setAttributes((prev) => ({
      ...prev,
      dueDate: prev.dueDate === 'today' ? null : 'today',
    }));
  };

  const handleToggleDueTomorrow = () => {
    setAttributes((prev) => ({
      ...prev,
      dueDate: prev.dueDate === 'tomorrow' ? null : 'tomorrow',
    }));
  };

  const handleToggleStar = () => {
    setAttributes((prev) => ({ ...prev, isStarred: !prev.isStarred }));
  };

  const handleToggleMyDay = () => {
    setAttributes((prev) => ({ ...prev, isMyDay: !prev.isMyDay }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    let dueDate: string | null = null;
    if (attributes.dueDate === 'today') {
      dueDate = getLocalDateString();
    } else if (attributes.dueDate === 'tomorrow') {
      dueDate = getTomorrowDateString();
    }

    addTask(trimmed, {
      isImportant: attributes.isStarred ? true : undefined,
      inMyDay: attributes.isMyDay ? true : undefined,
      dueDate,
    });

    setTitle('');
    setAttributes(INITIAL_ATTRIBUTES);
  };

  return (
    <footer
      data-testid="quick-add-bar"
      className="sticky bottom-0 z-10 p-3 bg-white/95 dark:bg-neutral-850/95 backdrop-blur border-t border-slate-200 dark:border-neutral-800 flex-shrink-0"
    >
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Shortcut Chips */}
        <div
          data-testid="quick-add-chips"
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs"
        >
          {/* Due Today Chip */}
          <ShortcutChip
            testId="chip-due-today"
            label="Today"
            ariaLabel="Due Today"
            isActive={attributes.dueDate === 'today'}
            activeColor="blue"
            icon={<Calendar className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />}
            onClick={handleToggleDueToday}
          />

          {/* Due Tomorrow Chip */}
          <ShortcutChip
            testId="chip-due-tomorrow"
            label="Tomorrow"
            ariaLabel="Due Tomorrow"
            isActive={attributes.dueDate === 'tomorrow'}
            activeColor="blue"
            icon={<CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />}
            onClick={handleToggleDueTomorrow}
          />

          {/* Star Chip */}
          <ShortcutChip
            testId="chip-star"
            label="Star"
            ariaLabel="Star"
            isActive={attributes.isStarred}
            activeColor="amber"
            icon={
              <Star
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  attributes.isStarred
                    ? 'fill-amber-500 text-amber-500'
                    : 'text-slate-400 dark:text-neutral-500'
                }`}
              />
            }
            onClick={handleToggleStar}
          />

          {/* Add to My Day Chip */}
          <ShortcutChip
            testId="chip-my-day"
            label="Add to My Day"
            ariaLabel="Add to My Day"
            isActive={attributes.isMyDay}
            activeColor="amber"
            icon={
              <Sun
                className={`w-3.5 h-3.5 flex-shrink-0 ${
                  attributes.isMyDay
                    ? 'text-amber-500 stroke-[2.5]'
                    : 'text-slate-400 dark:text-neutral-500'
                }`}
              />
            }
            onClick={handleToggleMyDay}
          />
        </div>

        {/* Input & Submit Row */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-neutral-800 rounded-xl border border-slate-200/80 dark:border-neutral-700/80 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all shadow-xs">
          <button
            type="submit"
            aria-label="Add task"
            className="p-1 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task"
            aria-label="Add a task"
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500"
          />
        </div>
      </form>
    </footer>
  );
};
