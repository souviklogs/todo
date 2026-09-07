import React, { useState, useEffect } from 'react';
import { X, Check, Trash2 } from 'lucide-react';
import type { TodoList } from '../types/todo';
import { COLOR_THEMES, EMOJI_OPTIONS, getThemeGradient } from '../constants/theme';

export interface ListModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  list?: TodoList | null;
  onClose: () => void;
  onSave: (data: { name: string; icon: string; colorTheme: string }) => void;
  onDelete?: (listId: string) => void;
}

export const ListModal: React.FC<ListModalProps> = ({
  isOpen,
  mode,
  list,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📋');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [customEmoji, setCustomEmoji] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && list) {
        setName(list.name);
        setSelectedEmoji(list.icon);
        setSelectedColor(list.colorTheme);
        setCustomEmoji('');
      } else {
        setName('');
        setSelectedEmoji('📋');
        setSelectedColor('blue');
        setCustomEmoji('');
      }
    }
  }, [isOpen, mode, list]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeEmoji = customEmoji.trim() || selectedEmoji;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    onSave({
      name: trimmed,
      icon: activeEmoji,
      colorTheme: selectedColor,
    });
  };

  const handleDelete = () => {
    if (list && onDelete) {
      onDelete(list.id);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="list-modal-title"
      data-testid="list-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        data-testid="list-modal-backdrop"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in scale-in duration-200 border border-slate-200 dark:border-neutral-800">
        {/* Header Preview Banner */}
        <div
          className={`bg-gradient-to-r ${getThemeGradient(
            selectedColor
          )} px-6 py-5 text-white flex items-center justify-between transition-colors duration-300`}
        >
          <div className="flex items-center gap-3">
            <span
              data-testid="selected-emoji-preview"
              className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner"
            >
              {activeEmoji}
            </span>
            <div>
              <h2
                id="list-modal-title"
                data-testid="list-modal-title"
                className="text-lg font-bold text-white leading-tight"
              >
                {mode === 'create' ? 'New List' : 'Edit List'}
              </h2>
              <p className="text-xs text-white/80">
                {mode === 'create'
                  ? 'Personalize your list with emojis & colors'
                  : 'Update title, icon, or accent color'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            data-testid="close-list-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* List Title Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="list-title-input"
              className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400"
            >
              List Title
            </label>
            <input
              id="list-title-input"
              data-testid="list-title-input"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Groceries, Vacation, Projects"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all"
            />
          </div>

          {/* Emoji Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 flex items-center justify-between">
              <span>Choose Emoji Icon</span>
              <span className="text-slate-400 text-[11px] font-normal lowercase">tap to select</span>
            </label>
            <div className="grid grid-cols-8 gap-1.5 p-2 bg-slate-50 dark:bg-neutral-800/60 rounded-xl border border-slate-200 dark:border-neutral-800 max-h-32 overflow-y-auto">
              {EMOJI_OPTIONS.map((emoji) => {
                const isSelected = selectedEmoji === emoji && !customEmoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    data-testid={`emoji-option-${emoji}`}
                    aria-label={`Select emoji ${emoji}`}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedEmoji(emoji);
                      setCustomEmoji('');
                    }}
                    className={`h-9 w-9 flex items-center justify-center text-lg rounded-lg transition-transform cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-neutral-700 shadow-md ring-2 ring-blue-500 scale-110 z-10'
                        : 'hover:bg-slate-200 dark:hover:bg-neutral-700/60 hover:scale-105'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                data-testid="custom-emoji-input"
                aria-label="Custom emoji"
                placeholder="Or type custom emoji..."
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                maxLength={4}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Color Theme Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
              Color Theme
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {COLOR_THEMES.map((theme) => {
                const isSelected = selectedColor === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    data-testid={`color-theme-${theme.id}`}
                    aria-label={`Select ${theme.name} theme`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedColor(theme.id)}
                    className={`h-10 rounded-xl ${theme.bgClass} flex items-center justify-center text-white transition-all cursor-pointer shadow-sm ${
                      isSelected
                        ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-105 shadow-md'
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-3">
            {mode === 'edit' && list && !list.isSystem ? (
              <button
                type="button"
                data-testid="delete-list-btn"
                aria-label="Delete list"
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete List</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="cancel-list-btn"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="save-list-btn"
                disabled={!name.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {mode === 'create' ? 'Create List' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
