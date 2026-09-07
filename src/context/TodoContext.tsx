import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Task, TodoList, CreateTodoListInput, UpdateTodoListInput } from '../types/todo';
import { DEFAULT_THEME_ID } from '../constants/theme';

export const STORAGE_KEY_TASKS = 'todo_tasks';
export const STORAGE_KEY_LISTS = 'todo_lists';

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

export function getLocalDateString(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

export const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Welcome to Tasks!',
    completed: false,
    isImportant: true,
    steps: [{ id: 'step-1-1', title: 'Tap to see details', completed: false }],
    listId: 'tasks',
    createdAt: '2026-09-07T08:00:00.000Z',
  },
  {
    id: 'task-2',
    title: 'Try adding a new task below',
    completed: false,
    isImportant: false,
    steps: [],
    listId: 'tasks',
    createdAt: '2026-09-07T08:01:00.000Z',
  },
  {
    id: 'task-3',
    title: 'Tap the circle to mark a task complete',
    completed: true,
    isImportant: false,
    steps: [],
    listId: 'tasks',
    createdAt: '2026-09-07T08:02:00.000Z',
  },
  {
    id: 'task-4',
    title: 'Plan weekend trip',
    completed: false,
    isImportant: false,
    steps: [],
    listId: 'personal',
    createdAt: '2026-09-07T08:03:00.000Z',
  },
  {
    id: 'task-5',
    title: 'Quarterly review presentation',
    completed: false,
    isImportant: true,
    steps: [],
    listId: 'work',
    createdAt: '2026-09-07T08:04:00.000Z',
  },
];

function loadFromStorage<T>(
  key: string,
  fallback: T,
  validator?: (data: unknown) => boolean
): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      return fallback;
    }
    return parsed;
  } catch (err) {
    console.error(`Failed to parse stored ${key}:`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

export function loadStoredTasks(customCurrentDate?: string | Date): Task[] {
  const loaded = loadFromStorage(STORAGE_KEY_TASKS, DEFAULT_TASKS, (data) => Array.isArray(data));
  const todayStr =
    typeof customCurrentDate === 'string'
      ? customCurrentDate
      : getLocalDateString(customCurrentDate);
  let changed = false;
  const migrated = loaded.map((t) => {
    if (t.inMyDay && t.myDayDate && t.myDayDate < todayStr) {
      changed = true;
      return { ...t, inMyDay: false, myDayDate: null };
    }
    return t;
  });
  if (changed) {
    saveStoredTasks(migrated);
  }
  return migrated;
}

export function saveStoredTasks(tasks: Task[]): void {
  saveToStorage(STORAGE_KEY_TASKS, tasks);
}

export function loadStoredLists(): TodoList[] {
  const loaded = loadFromStorage(
    STORAGE_KEY_LISTS,
    DEFAULT_LISTS,
    (data) => Array.isArray(data) && data.length > 0
  );
  if (!loaded.some((l) => l.id === MY_DAY_LIST.id)) {
    loaded.unshift(MY_DAY_LIST);
  } else {
    const myDayIdx = loaded.findIndex((l) => l.id === MY_DAY_LIST.id);
    if (myDayIdx > 0) {
      const [myDayItem] = loaded.splice(myDayIdx, 1);
      loaded.unshift(myDayItem);
    }
  }
  if (!loaded.some((l) => l.id === IMPORTANT_LIST.id)) {
    const tasksIdx = loaded.findIndex((l) => l.id === DEFAULT_LIST.id);
    if (tasksIdx !== -1) {
      loaded.splice(tasksIdx + 1, 0, IMPORTANT_LIST);
    } else {
      loaded.push(IMPORTANT_LIST);
    }
  }
  return loaded;
}

export function saveStoredLists(lists: TodoList[]): void {
  saveToStorage(STORAGE_KEY_LISTS, lists);
}

interface TodoContextType {
  tasks: Task[];
  currentTasks: Task[];
  lists: TodoList[];
  currentList: TodoList;
  setCurrentList: (list: TodoList) => void;
  addTask: (title: string, listId?: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  toggleImportant: (id: string) => void;
  toggleMyDay: (id: string) => void;
  addToMyDay: (id: string) => void;
  removeFromMyDay: (id: string) => void;
  checkMidnightRollover: (customCurrentDate?: string | Date) => boolean;
  addList: (data: CreateTodoListInput) => TodoList;
  updateList: (id: string, updates: UpdateTodoListInput) => void;
  deleteList: (id: string) => void;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

interface TodoProviderProps {
  children: React.ReactNode;
  initialTasks?: Task[];
  initialLists?: TodoList[];
  initialCurrentList?: TodoList;
}

export const TodoProvider: React.FC<TodoProviderProps> = ({
  children,
  initialTasks,
  initialLists,
  initialCurrentList,
}) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (initialTasks) return initialTasks;
    return loadStoredTasks();
  });
  const [lists, setLists] = useState<TodoList[]>(() => {
    if (initialLists) return initialLists;
    return loadStoredLists();
  });
  const [currentList, setCurrentList] = useState<TodoList>(() => {
    if (initialCurrentList) return initialCurrentList;
    const loaded = initialLists ?? loadStoredLists();
    return loaded.find((l) => l.id === DEFAULT_LIST.id) ?? loaded[0] ?? DEFAULT_LIST;
  });

  const checkMidnightRollover = useCallback((customCurrentDate?: string | Date): boolean => {
    const todayStr =
      typeof customCurrentDate === 'string'
        ? customCurrentDate
        : getLocalDateString(customCurrentDate);

    let hasRolledOver = false;
    setTasks((prev) => {
      let changed = false;
      const updated = prev.map((t) => {
        if (t.inMyDay && t.myDayDate && t.myDayDate < todayStr) {
          changed = true;
          hasRolledOver = true;
          return { ...t, inMyDay: false, myDayDate: null };
        }
        return t;
      });
      return changed ? updated : prev;
    });
    return hasRolledOver;
  }, []);

  // Periodic and visibility-based midnight rollover check
  useEffect(() => {
    checkMidnightRollover();
    const interval = setInterval(() => {
      checkMidnightRollover();
    }, 60000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkMidnightRollover();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => checkMidnightRollover());
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', () => checkMidnightRollover());
      }
    };
  }, [checkMidnightRollover]);

  // Synchronize tasks to localStorage whenever tasks change
  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  // Synchronize lists to localStorage whenever lists change
  useEffect(() => {
    saveStoredLists(lists);
  }, [lists]);

  const currentTasks = useMemo(() => {
    const todayStr = getLocalDateString();
    if (
      currentList.id === MY_DAY_LIST.id ||
      currentList.id === 'myday' ||
      currentList.id === 'my-day'
    ) {
      return tasks.filter((t) => Boolean(t.inMyDay) && (!t.myDayDate || t.myDayDate >= todayStr));
    }
    if (currentList.id === IMPORTANT_LIST.id) {
      return tasks.filter((t) => Boolean(t.isImportant));
    }
    return tasks.filter((t) => (t.listId ?? DEFAULT_LIST.id) === currentList.id);
  }, [tasks, currentList.id]);

  const addTask = useCallback(
    (title: string, listId?: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      const isImportantView = currentList.id === IMPORTANT_LIST.id;
      const isMyDayView =
        currentList.id === MY_DAY_LIST.id ||
        currentList.id === 'myday' ||
        currentList.id === 'my-day';
      const targetListId =
        listId ?? (isImportantView || isMyDayView ? DEFAULT_LIST.id : currentList.id);

      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: trimmed,
        completed: false,
        isImportant: isImportantView,
        inMyDay: isMyDayView,
        myDayDate: isMyDayView ? getLocalDateString() : null,
        steps: [],
        listId: targetListId,
        createdAt: new Date().toISOString(),
      };

      setTasks((prev) => [...prev, newTask]);
    },
    [currentList.id]
  );

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleImportant = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isImportant: !t.isImportant } : t))
    );
  }, []);

  const toggleMyDay = useCallback((id: string) => {
    const todayStr = getLocalDateString();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextInMyDay = !t.inMyDay;
        return {
          ...t,
          inMyDay: nextInMyDay,
          myDayDate: nextInMyDay ? todayStr : null,
        };
      })
    );
  }, []);

  const addToMyDay = useCallback((id: string) => {
    const todayStr = getLocalDateString();
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, inMyDay: true, myDayDate: todayStr } : t))
    );
  }, []);

  const removeFromMyDay = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, inMyDay: false, myDayDate: null } : t))
    );
  }, []);

  const addList = useCallback(
    (data: CreateTodoListInput): TodoList => {
      const trimmed = data.name.trim();
      const newList: TodoList = {
        id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: trimmed || 'Untitled list',
        icon: data.icon || '📋',
        colorTheme: data.colorTheme || DEFAULT_THEME_ID,
        isSystem: false,
      };
      setLists((prev) => [...prev, newList]);
      return newList;
    },
    []
  );

  const updateList = useCallback(
    (id: string, updates: UpdateTodoListInput) => {
      setLists((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
      );
      setCurrentList((prev) => (prev.id === id ? { ...prev, ...updates } : prev));
    },
    []
  );

  const deleteList = useCallback((id: string) => {
    setLists((prev) => {
      const target = prev.find((l) => l.id === id);
      if (target?.isSystem) return prev;
      return prev.filter((l) => l.id !== id);
    });
    setTasks((prev) => prev.filter((t) => t.listId !== id));
    setCurrentList((prev) => {
      if (prev.id === id) {
        return DEFAULT_LIST;
      }
      return prev;
    });
  }, []);

  return (
    <TodoContext.Provider
      value={{
        tasks,
        currentTasks,
        lists,
        currentList,
        setCurrentList,
        addTask,
        toggleTask,
        deleteTask,
        toggleImportant,
        toggleMyDay,
        addToMyDay,
        removeFromMyDay,
        checkMidnightRollover,
        addList,
        updateList,
        deleteList,
      }}
    >
      {children}
    </TodoContext.Provider>
  );
};

export const useTodoContext = (): TodoContextType => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodoContext must be used within a TodoProvider');
  }
  return context;
};

export const useTodoStore = useTodoContext;
