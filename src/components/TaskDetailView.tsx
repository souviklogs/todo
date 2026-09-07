import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Check, Plus, Trash2, Sun, Calendar, FileText } from 'lucide-react';
import type { Task } from '../types/todo';
import {
  getStepProgress,
  formatDueDateBadge,
  getLocalDateString,
  getTomorrowDateString,
} from '../types/todo';
import { useTodoContext } from '../context/TodoContext';

interface TaskDetailViewProps {
  task: Task | null;
  onClose: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ task, onClose }) => {
  const {
    toggleTask,
    deleteTask,
    addStep,
    toggleStep,
    deleteStep,
    toggleMyDay,
    setTaskNotes,
    setTaskDueDate,
    currentList,
  } = useTodoContext();
  const [newStepTitle, setNewStepTitle] = useState('');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNotes(task?.notes ?? '');
  }, [task?.id, task?.notes]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    if (task) {
      setTaskNotes(task.id, val);
    }
  };

  const handleNotesBlur = () => {
    if (task) {
      setTaskNotes(task.id, notes);
    }
  };

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
  const dueDateInfo = formatDueDateBadge(task.dueDate);
  const todayStr = getLocalDateString();
  const tomorrowStr = getTomorrowDateString();

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

        {/* My Day Toggle Button */}
        <button
          type="button"
          data-testid="detail-my-day-btn"
          aria-label={task.inMyDay ? 'Remove from My Day' : 'Add to My Day'}
          onClick={() => toggleMyDay(task.id)}
          className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-colors cursor-pointer ${
            task.inMyDay
              ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/80 text-amber-700 dark:text-amber-300'
              : 'bg-white dark:bg-neutral-800 border-slate-200/80 dark:border-neutral-700/80 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-750'
          }`}
        >
          <div className="flex items-center gap-3">
            <Sun
              className={`w-5 h-5 flex-shrink-0 ${
                task.inMyDay
                  ? 'text-amber-500 fill-amber-400 stroke-[2.5]'
                  : 'text-slate-400 dark:text-neutral-400'
              }`}
            />
            <span className="text-sm font-medium">
              {task.inMyDay ? 'Remove from My Day' : 'Add to My Day'}
            </span>
          </div>
          {task.inMyDay && (
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
              Added
            </span>
          )}
        </button>

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

        {/* Due Date Section */}
        <section
          aria-label="Due Date"
          data-testid="detail-due-date-section"
          className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-slate-200/80 dark:border-neutral-700/80 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Due Date
              </h3>
            </div>
            {task.dueDate && (
              <button
                type="button"
                aria-label="Clear due date"
                data-testid="detail-clear-due-date-btn"
                onClick={() => setTaskDueDate(task.id, null)}
                className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline cursor-pointer"
              >
                Clear due date
              </button>
            )}
          </div>

          {/* Current Due Date Display (if set) */}
          {task.dueDate && dueDateInfo && (
            <div
              data-testid="detail-due-date-display"
              className={`text-xs px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${
                dueDateInfo.isOverdue
                  ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 font-medium'
                  : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 font-medium'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dueDateInfo.label}</span>
              <span className="text-slate-400 dark:text-neutral-500 font-normal">({task.dueDate})</span>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              data-testid="due-date-shortcut-today"
              onClick={() => setTaskDueDate(task.id, todayStr)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer text-center ${
                task.dueDate === todayStr
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-750'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              data-testid="due-date-shortcut-tomorrow"
              onClick={() => setTaskDueDate(task.id, tomorrowStr)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer text-center ${
                task.dueDate === tomorrowStr
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-750'
              }`}
            >
              Tomorrow
            </button>
            <button
              type="button"
              data-testid="due-date-shortcut-custom"
              aria-label="Pick Date (Custom Date)"
              onClick={() => {
                dateInputRef.current?.focus();
                try {
                  dateInputRef.current?.showPicker?.();
                } catch {}
              }}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer text-center ${
                task.dueDate && task.dueDate !== todayStr && task.dueDate !== tomorrowStr
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 hover:bg-slate-50 dark:hover:bg-neutral-750'
              }`}
            >
              Custom Date
            </button>
          </div>

          {/* Custom Date Input */}
          <div className="pt-1">
            <label
              htmlFor="detail-due-date-input"
              className="block text-xs font-medium text-slate-500 dark:text-neutral-400 mb-1"
            >
              Pick Date / Custom Date
            </label>
            <input
              ref={dateInputRef}
              id="detail-due-date-input"
              type="date"
              aria-label="Custom Date"
              data-testid="detail-due-date-input"
              value={task.dueDate ?? ''}
              onChange={(e) => setTaskDueDate(task.id, e.target.value || null)}
              className="w-full text-sm px-3 py-2 bg-slate-50 dark:bg-neutral-900 text-slate-800 dark:text-neutral-100 rounded-lg border border-slate-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            />
          </div>
        </section>

        {/* Notes Section */}
        <section
          aria-label="Notes"
          data-testid="detail-notes-section"
          className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-slate-200/80 dark:border-neutral-700/80 shadow-xs space-y-2"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <label
              htmlFor="detail-notes-textarea"
              className="text-xs font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer"
            >
              Notes
            </label>
          </div>
          <textarea
            id="detail-notes-textarea"
            data-testid="detail-notes-textarea"
            aria-label="Notes"
            placeholder="Add notes..."
            rows={4}
            value={notes}
            onChange={handleNotesChange}
            onBlur={handleNotesBlur}
            className="w-full bg-slate-50 dark:bg-neutral-900 text-sm text-slate-800 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 rounded-lg p-3 border border-slate-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-y"
          />
        </section>
      </div>
    </div>
  );
};
