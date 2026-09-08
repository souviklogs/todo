import type { TodoList } from '../types/todo';
import { DEFAULT_THEME_ID } from './theme';

export const MY_DAY_LIST: TodoList = {
  id: 'my-day',
  name: 'My Day',
  icon: 'Sun',
  colorTheme: 'sunrise',
  isSystem: true,
};

export const DEFAULT_LIST: TodoList = {
  id: 'tasks',
  name: 'Tasks',
  icon: 'ListTodo',
  colorTheme: DEFAULT_THEME_ID,
  isSystem: true,
};

export const IMPORTANT_LIST: TodoList = {
  id: 'important',
  name: 'Important',
  icon: 'Star',
  colorTheme: 'rose',
  isSystem: true,
};

export const DEFAULT_LISTS: TodoList[] = [
  MY_DAY_LIST,
  DEFAULT_LIST,
  IMPORTANT_LIST,
  {
    id: 'personal',
    name: 'Personal',
    icon: 'User',
    colorTheme: 'purple',
    isSystem: false,
  },
  {
    id: 'work',
    name: 'Work',
    icon: 'Briefcase',
    colorTheme: 'emerald',
    isSystem: false,
  },
];
