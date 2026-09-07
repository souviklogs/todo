import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import type { Task } from '../types/todo';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onDelete }) => {
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

      <button
        type="button"
        aria-label={`Delete task "${task.title}"`}
        data-testid={`delete-task-${task.id}`}
        onClick={() => onDelete(task.id)}
        className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
};
