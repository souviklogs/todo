import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTodoContext } from '../context/TodoContext';

export const QuickAddBar: React.FC = () => {
  const [title, setTitle] = useState('');
  const { addTask } = useTodoContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title);
    setTitle('');
  };

  return (
    <footer className="p-3 bg-white/90 dark:bg-neutral-850/90 backdrop-blur border-t border-slate-200 dark:border-neutral-800">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-neutral-800 rounded-xl border border-slate-200/80 dark:border-neutral-700/80 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all shadow-xs"
      >
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
      </form>
    </footer>
  );
};
