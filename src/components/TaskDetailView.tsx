import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react';
import type { Task } from '../types/todo';
import { getStepProgress } from '../types/todo';
import { useTodoContext } from '../context/TodoContext';

interface TaskDetailViewProps {
  task: Task | null;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task, onClose }) => {
  const { toggleTask, deleteTask, addStep, toggleStep, deleteStep, currentList } =
    useTodoContext();
  const [newStepTitle, setNewStepTitle] = useState('');

  // Close on Escape key press
  useEffect(() => {
    if (!task) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [task, onClose]);

  if (!task) return null;

  const steps = task.steps ?? [];
  const stepProgress = getStepProgress(steps);

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStepTitle.trim();
    if (!trimmed) return;
    addStep(task.id, trimmed);
    setNewStepTitle('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Task details: ${task.title}`}
      data-testid="task-detail-view"
      className="absolute inset-0 bg-white dark:bg-neutral-900 z-50 flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden"
    >
      {/* Header with Back Button */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-shrink-0">
        <button
          type="button"
          aria-label="Back"
          data-testid="detail-back-btn"
          id="detail-back-btn"
          onClick={onClose}
          className="flex items-center gap-1.5 p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <span
          data-testid="detail-list-pill"
          className="text-xs font-medium text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full"
        >
          {currentList.name}
        </span>

        <button
          type="button"
          aria-label={`Delete task "${task.title}"`}
          data-testid="detail-delete-task-btn"
          onClick={() => {
            deleteTask(task.id);
            onClose();
          }}
          className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </header>

      {/* Main Detail Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Task Title & Completion Card */}
        <div className="bg-slate-50 dark:bg-neutral-800/80 rounded-xl p-4 border border-slate-200/80 dark:border-neutral-700/80 shadow-xs">
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={task.completed}
              aria-label={task.title}
              data-testid="detail-toggle-task"
              onClick={() => toggleTask(task.id)}
              className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0 mt-0.5 cursor-pointer ${
                task.completed
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-400 dark:border-neutral-500 hover:border-blue-600 dark:hover:border-blue-400'
              }`}
            >
              {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            <div className="flex-1 min-w-0">
              <h2
                data-testid="detail-task-title"
                className={`text-base font-semibold leading-snug break-words ${
                  task.completed
                    ? 'line-through text-slate-400 dark:text-neutral-500'
                    : 'text-slate-800 dark:text-neutral-100'
                }`}
              >
                {task.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Steps / Subtasks Section */}
        <section
          aria-label="Subtasks"
          data-testid="detail-steps-section"
          className="bg-slate-50/50 dark:bg-neutral-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-neutral-700/80 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Steps
            </h3>
            {stepProgress && (
              <span
                data-testid="detail-steps-progress"
                className="text-xs font-medium text-slate-500 dark:text-neutral-400"
              >
                {stepProgress.label}
              </span>
            )}
          </div>

          {/* Steps List */}
          {steps.length > 0 && (
            <ul data-testid="detail-steps-list" className="space-y-2">
              {steps.map((step) => (
                <li
                  key={step.id}
                  data-testid={`step-item-${step.id}`}
                  className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-neutral-800 rounded-lg border border-slate-200/80 dark:border-neutral-700/80 shadow-2xs group"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={step.completed}
                    aria-label={
                      step.completed
                        ? `Mark step "${step.title}" as incomplete`
                        : `Mark step "${step.title}" as complete`
                    }
                    data-testid={`toggle-step-${step.id}`}
                    onClick={() => toggleStep(task.id, step.id)}
                    className={`w-4 h-4 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0 cursor-pointer ${
                      step.completed
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-400 dark:border-neutral-500 hover:border-blue-600 dark:hover:border-blue-400'
                    }`}
                  >
                    {step.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </button>

                  <span
                    data-testid={`step-title-${step.id}`}
                    className={`flex-1 text-sm select-text break-words ${
                      step.completed
                        ? 'line-through text-slate-400 dark:text-neutral-500'
                        : 'text-slate-800 dark:text-neutral-100'
                    }`}
                  >
                    {step.title}
                  </span>

                  <button
                    type="button"
                    aria-label={`Delete step "${step.title}"`}
                    data-testid={`delete-step-${step.id}`}
                    onClick={() => deleteStep(task.id, step.id)}
                    className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add Step Input Form */}
          <form
            onSubmit={handleAddStep}
            className="flex items-center gap-2 p-2 bg-white dark:bg-neutral-800 rounded-lg border border-slate-200 dark:border-neutral-700 focus-within:border-blue-500 dark:focus-within:border-blue-400 transition-colors"
          >
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <input
              type="text"
              aria-label="Add step"
              placeholder="Add step"
              data-testid="add-step-input"
              value={newStepTitle}
              onChange={(e) => setNewStepTitle(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-800 dark:text-neutral-100 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Add step"
              data-testid="add-step-btn"
              disabled={!newStepTitle.trim()}
              className="px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Add
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
