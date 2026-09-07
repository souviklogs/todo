import React from 'react';
import { Check, Trash2, Star } from 'lucide-react';
import type { Task } from '../types/todo';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleImportant?: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onDelete,
  onToggleImportant,
}) => {
  const isStarred = Boolean(task.isImportant);

  return (
    <li
      data-testid={`task-item-${task.id}`}
      className="flex items-center gap-3 p-3.5 bg-white dark:bg-neutral-800 rounded-xl border border-slate-200/80 dark:border-neutral-700/80 shadow-xs hover:border-slate-300 dark:hover:border-neutral-600 transition-all group"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={task.title}
        onClick={() => onToggle(task.id)}
        className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0 cursor-pointer ${
          task.completed
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'border-slate-400 dark:border-neutral-500 hover:border-blue-600 dark:hover:border-blue-400'
        }`}
      >
        {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
      </button>

      <span
        className={`flex-1 text-sm font-medium transition-all select-text break-words ${
          task.completed
            ? 'line-through text-slate-400 dark:text-neutral-500'
            : 'text-slate-800 dark:text-neutral-100'
        }`}
      >
        {task.title}
      </span>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          aria-label={
            isStarred
              ? `Unstar task "${task.title}" (Important)`
              : `Star task "${task.title}" (Mark as important)`
          }
          aria-pressed={isStarred}
          data-testid={`star-task-${task.id}`}
          data-starred={isStarred}
          onClick={(e) => {
            e.stopPropagation();
            onToggleImportant?.(task.id);
          }}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            isStarred
              ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
              : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:bg-neutral-700'
          }`}
        >
          <Star
            className={`w-4 h-4 transition-transform active:scale-125 ${
              isStarred
                ? 'fill-amber-400 text-amber-500 dark:fill-amber-400 dark:text-amber-400'
                : 'fill-none'
            }`}
          />
        </button>

        <button
          type="button"
          aria-label={`Delete task "${task.title}"`}
          data-testid={`delete-task-${task.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
};
