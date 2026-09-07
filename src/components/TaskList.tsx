import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTodoContext } from '../context/TodoContext';
import { TaskItem } from './TaskItem';

export const TaskList: React.FC = () => {
  const { tasks, currentList, toggleTask, deleteTask } = useTodoContext();

  const filteredTasks = tasks.filter(
    (t) => !t.listId || t.listId === currentList.id
  );

  if (filteredTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-neutral-200">
          No tasks yet
        </h2>
        <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mt-1 leading-relaxed">
          Add a task below to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5" data-testid="task-list">
      {filteredTasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={toggleTask}
          onDelete={deleteTask}
        />
      ))}
    </ul>
  );
};
