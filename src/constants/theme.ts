export interface ColorThemeOption {
  id: string;
  name: string;
  gradient: string;
  bgClass: string;
}

export const COLOR_THEMES: ColorThemeOption[] = [
  { id: 'blue', name: 'Blue', gradient: 'from-blue-600 via-indigo-600 to-sky-500', bgClass: 'bg-blue-600' },
  { id: 'purple', name: 'Purple', gradient: 'from-purple-600 via-fuchsia-600 to-pink-500', bgClass: 'bg-purple-600' },
  { id: 'emerald', name: 'Emerald', gradient: 'from-emerald-600 via-teal-600 to-cyan-500', bgClass: 'bg-emerald-600' },
  { id: 'rose', name: 'Rose', gradient: 'from-rose-600 via-pink-600 to-red-500', bgClass: 'bg-rose-600' },
  { id: 'amber', name: 'Amber', gradient: 'from-amber-500 via-orange-600 to-yellow-500', bgClass: 'bg-amber-500' },
  { id: 'indigo', name: 'Indigo', gradient: 'from-indigo-600 via-violet-600 to-purple-500', bgClass: 'bg-indigo-600' },
  { id: 'cyan', name: 'Cyan', gradient: 'from-cyan-600 via-teal-600 to-blue-500', bgClass: 'bg-cyan-600' },
  { id: 'slate', name: 'Slate', gradient: 'from-slate-700 via-zinc-700 to-stone-600', bgClass: 'bg-slate-700' },
];

export const THEME_GRADIENTS: Record<string, string> = {
  blue: 'from-blue-600 via-indigo-600 to-sky-500',
  purple: 'from-purple-600 via-fuchsia-600 to-pink-500',
  emerald: 'from-emerald-600 via-teal-600 to-cyan-500',
  green: 'from-emerald-600 via-teal-600 to-cyan-500',
  rose: 'from-rose-600 via-pink-600 to-red-500',
  red: 'from-rose-600 via-pink-600 to-red-500',
  amber: 'from-amber-500 via-orange-600 to-yellow-500',
  orange: 'from-amber-500 via-orange-600 to-yellow-500',
  indigo: 'from-indigo-600 via-violet-600 to-purple-500',
  cyan: 'from-cyan-600 via-teal-600 to-blue-500',
  slate: 'from-slate-700 via-zinc-700 to-stone-600',
  gray: 'from-slate-700 via-zinc-700 to-stone-600',
};

export const EMOJI_OPTIONS = [
  '📋', '📝', '🛒', '💼', '🏠', '🎯', '🚀', '💡',
  '❤️', '⭐', '✈️', '📚', '🎨', '🎵', '🏋️', '🍕',
  '☕', '💻', '🌿', '🎁', '🎂', '🔔', '🏷️', '🔑',
];

export const getThemeGradient = (colorTheme?: string): string => {
  if (!colorTheme) return THEME_GRADIENTS.blue;
  return THEME_GRADIENTS[colorTheme.toLowerCase()] ?? THEME_GRADIENTS.blue;
};
