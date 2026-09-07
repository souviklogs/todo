import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Star, Sun, ChevronDown } from 'lucide-react';
import { useTodoContext, IMPORTANT_LIST, MY_DAY_LIST } from '../context/TodoContext';
import type { Task } from '../types/todo';
import { TaskItem } from './TaskItem';

interface EmptyStateConfig {
  iconWrapperClass: string;
  icon: React.ReactNode;
  description: string;
}

const EMPTY_STATE_CONFIGS: Record<string, EmptyStateConfig> = {
  [MY_DAY_LIST.id]: {
    iconWrapperClass: 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    icon: <Sun className="w-8 h-8 animate-pulse text-amber-500" />,
    description: 'Add tasks to My Day to plan your day.',
  },
  [IMPORTANT_LIST.id]: {
    iconWrapperClass: 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
    icon: <Star className="w-8 h-8 animate-pulse fill-rose-500/20" />,
    description: 'Star tasks to show them in Important.',
  },
};

const DEFAULT_EMPTY_STATE: EmptyStateConfig = {
  iconWrapperClass: 'bg-blue-100 dark:bg-neutral-800 text-blue-600 dark:text-blue-400',
  icon: <Sparkles className="w-8 h-8 animate-pulse" />,
  description: 'Add a task below to get started.',
};

interface CompletedTasksSectionProps {
  tasks: Task[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  renderTaskItem: (task: Task) => React.ReactNode;
}

export const CompletedTasksSection: React.FC<CompletedTasksSectionProps> = ({
  tasks,
  isExpanded,
  onToggleExpand,
  renderTaskItem,
}) => {
  if (tasks.length === 0) return null;

  return (
    <section
      data-testid="completed-section"
      className="pt-2 border-t border-slate-200/60 dark:border-neutral-800/60"
      aria-label="Completed tasks"
    >
      <button
        type="button"
        data-testid="completed-accordion-toggle"
        aria-expanded={isExpanded}
        aria-controls="completed-tasks-list"
        onClick={onToggleExpand}
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 hover:bg-slate-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer select-none"
      >
        <ChevronDown
          data-testid="completed-chevron"
          className={`w-4 h-4 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
        <span data-testid="completed-count-badge">
          Completed ({tasks.length})
        </span>
      </button>

      <div
        id="completed-tasks-list"
        data-testid="completed-tasks-list"
        data-expanded={isExpanded}
        className={`transition-all duration-300 ease-in-out ${
          isExpanded
            ? 'max-h-[5000px] opacity-100 mt-2.5'
            : 'max-h-0 opacity-0 overflow-hidden pointer-events-none'
        }`}
      >
        <ul className="space-y-2.5" data-testid="completed-task-items">
          {tasks.map(renderTaskItem)}
        </ul>
      </div>
    </section>
  );
};

export const TaskList: React.FC = () => {
  const {
    currentTasks,
    currentList,
    toggleTask,
    deleteTask,
    toggleImportant,
    toggleMyDay,
    setSelectedTaskId,
  } = useTodoContext();

  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  useEffect(() => {
    setIsCompletedExpanded(false);
  }, [currentList.id]);

  const activeTasks = useMemo(
    () => currentTasks.filter((t) => !t.completed),
    [currentTasks]
  );
  const completedTasks = useMemo(
    () => currentTasks.filter((t) => t.completed),
    [currentTasks]
  );

  const renderTaskItem = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      onToggle={toggleTask}
      onDelete={deleteTask}
      onToggleImportant={toggleImportant}
      onToggleMyDay={toggleMyDay}
      onSelect={setSelectedTaskId}
    />
  );

  if (currentTasks.length === 0) {
    const { iconWrapperClass, icon, description } =
      EMPTY_STATE_CONFIGS[currentList.id] ?? DEFAULT_EMPTY_STATE;

    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-inner ${iconWrapperClass}`}
        >
          {icon}
        </div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-neutral-200">
          No tasks yet
        </h2>
        <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-xs mt-1 leading-relaxed">
          {description}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Tasks List */}
      <ul className="space-y-2.5" data-testid="task-list">
        {activeTasks.map(renderTaskItem)}
      </ul>

      {/* Collapsible Completed Section */}
      <CompletedTasksSection
        tasks={completedTasks}
        isExpanded={isCompletedExpanded}
        onToggleExpand={() => setIsCompletedExpanded((prev) => !prev)}
        renderTaskItem={renderTaskItem}
      />
    </div>
  );
};
