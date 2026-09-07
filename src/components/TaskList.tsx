import React from 'react';
import { Sparkles, Star, Sun } from 'lucide-react';
import { useTodoContext, IMPORTANT_LIST, MY_DAY_LIST } from '../context/TodoContext';
import { TaskItem } from './TaskItem';

export const TaskList: React.FC = () => {
  const { currentTasks, currentList, toggleTask, deleteTask, toggleImportant, toggleMyDay } =
    useTodoContext();

  if (currentTasks.length === 0) {
    const isImportantList = currentList.id === IMPORTANT_LIST.id;
    const isMyDayList = currentList.id === MY_DAY_LIST.id;

    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner ${
            isMyDayList
              ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              : isImportantList
              ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
              : 'bg-blue-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400'
          }`}
        >
          {isMyDayList ? (
            <Sun className="w-8 h-8 animate-pulse text-amber-500" />
          ) : isImportantList ? (
            <Star className="w-8 h-8 animate-pulse fill-rose-500/20" />
          ) : (
            <Sparkles className="w-8 h-8 animate-pulse" />
          )}
        </div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-neutral-200">
          No tasks yet
        </h2>
        <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mt-1 leading-relaxed">
          {isMyDayList
            ? 'Add tasks to My Day to plan your day.'
            : isImportantList
            ? 'Star tasks to show them in Important.'
            : 'Add a task below to get started.'}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5" data-testid="task-list">
      {currentTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={toggleTask}
          onDelete={deleteTask}
          onToggleImportant={toggleImportant}
          onToggleMyDay={toggleMyDay}
        />
      ))}
    </ul>
  );
};
