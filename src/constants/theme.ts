export interface ColorThemeOption {
  id: string;
  name: string;
  gradient: string;
  bgClass: string;
}

export const DEFAULT_THEME_ID = 'blue';

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

const THEME_ALIASES: Record<string, string> = {
  green: 'emerald',
  red: 'rose',
  orange: 'amber',
  gray: 'slate',
};

export const THEME_GRADIENTS: Record<string, string> = {
  ...Object.fromEntries(COLOR_THEMES.map((theme) => [theme.id, theme.gradient])),
  ...Object.fromEntries(
    Object.entries(THEME_ALIASES).map(([alias, targetId]) => {
      const target = COLOR_THEMES.find((theme) => theme.id === targetId);
      return [alias, target?.gradient ?? ''];
    })
  ),
};

export const EMOJI_OPTIONS = [
  '📋', '📝', '🛒', '💼', '🏠', '🎯', '🚀', '💡',
  '❤️', '⭐', '✈️', '📚', '🎨', '🎵', '🏋️', '🍕',
  '☕', '💻', '🌿', '🎁', '🎂', '🔔', '🏷️', '🔑',
];

export const getThemeGradient = (colorTheme?: string): string => {
  if (!colorTheme) return THEME_GRADIENTS[DEFAULT_THEME_ID];
  return THEME_GRADIENTS[colorTheme.toLowerCase()] ?? THEME_GRADIENTS[DEFAULT_THEME_ID];
};
