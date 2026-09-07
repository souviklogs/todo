import React, { useState } from 'react';
import { Plus, Calendar, CalendarDays, Star, Sun } from 'lucide-react';
import { useTodoContext } from '../context/TodoContext';
import { getLocalDateString, getTomorrowDateString } from '../types/todo';

export const QuickAddBar: React.FC = () => {
  const [title, setTitle] = useState('');
  const [selectedDueDate, setSelectedDueDate] = useState<'today' | 'tomorrow' | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [isMyDay, setIsMyDay] = useState(false);
  const { addTask, selectedTask } = useTodoContext();

  if (selectedTask) {
    return null;
  }

  const handleToggleDueToday = () => {
    setSelectedDueDate((prev) => (prev === 'today' ? null : 'today'));
  };

  const handleToggleDueTomorrow = () => {
    setSelectedDueDate((prev) => (prev === 'tomorrow' ? null : 'tomorrow'));
  };

  const handleToggleStar = () => {
    setIsStarred((prev) => !prev);
  };

  const handleToggleMyDay = () => {
    setIsMyDay((prev) => !prev);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    let dueDate: string | null = null;
    if (selectedDueDate === 'today') {
      dueDate = getLocalDateString();
    } else if (selectedDueDate === 'tomorrow') {
      dueDate = getTomorrowDateString();
    }

    addTask(trimmed, {
      isImportant: isStarred ? true : undefined,
      inMyDay: isMyDay ? true : undefined,
      dueDate,
    });

    setTitle('');
    setSelectedDueDate(null);
    setIsStarred(false);
    setIsMyDay(false);
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
          <button
            type="button"
            data-testid="chip-due-today"
            aria-label="Due Today"
            aria-pressed={selectedDueDate === 'today'}
            data-active={selectedDueDate === 'today'}
            onClick={handleToggleDueToday}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border flex-shrink-0 ${
              selectedDueDate === 'today'
                ? 'bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-600 font-semibold'
                : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700/80 dark:hover:bg-neutral-700'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Today</span>
          </button>

          {/* Due Tomorrow Chip */}
          <button
            type="button"
            data-testid="chip-due-tomorrow"
            aria-label="Due Tomorrow"
            aria-pressed={selectedDueDate === 'tomorrow'}
            data-active={selectedDueDate === 'tomorrow'}
            onClick={handleToggleDueTomorrow}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border flex-shrink-0 ${
              selectedDueDate === 'tomorrow'
                ? 'bg-blue-100 text-blue-700 border-blue-400 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-600 font-semibold'
                : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700/80 dark:hover:bg-neutral-700'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <span>Tomorrow</span>
          </button>

          {/* Star Chip */}
          <button
            type="button"
            data-testid="chip-star"
            aria-label="Star"
            aria-pressed={isStarred}
            data-active={isStarred}
            onClick={handleToggleStar}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border flex-shrink-0 ${
              isStarred
                ? 'bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-600 font-semibold'
                : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700/80 dark:hover:bg-neutral-700'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                isStarred
                  ? 'fill-amber-500 text-amber-500'
                  : 'text-slate-400 dark:text-neutral-500'
              }`}
            />
            <span>Star</span>
          </button>

          {/* Add to My Day Chip */}
          <button
            type="button"
            data-testid="chip-my-day"
            aria-label="Add to My Day"
            aria-pressed={isMyDay}
            data-active={isMyDay}
            onClick={handleToggleMyDay}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border flex-shrink-0 ${
              isMyDay
                ? 'bg-amber-100 text-amber-700 border-amber-400 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-600 font-semibold'
                : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700/80 dark:hover:bg-neutral-700'
            }`}
          >
            <Sun
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                isMyDay
                  ? 'text-amber-500 stroke-[2.5]'
                  : 'text-slate-400 dark:text-neutral-500'
              }`}
            />
            <span>Add to My Day</span>
          </button>
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
