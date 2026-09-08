import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import type {
  Task,
  TodoList,
  CreateTodoListInput,
  UpdateTodoListInput,
  AddTaskOptions,
  BackupData,
} from '../types/todo';
import { getLocalDateString } from '../types/todo';
import { DEFAULT_THEME_ID } from '../constants/theme';
import { triggerCompletionSensory } from '../utils/sensory';
import {
  createBackupPayload,
  ensureSystemLists,
  parseAndValidateBackup,
  validateBackupData,
} from '../utils/backup';
import {
  MY_DAY_LIST,
  DEFAULT_LIST,
  IMPORTANT_LIST,
  DEFAULT_LISTS,
} from '../constants/lists';

export { getLocalDateString, MY_DAY_LIST, DEFAULT_LIST, IMPORTANT_LIST, DEFAULT_LISTS };

export const STORAGE_KEY_TASKS = 'todo_tasks';
export const STORAGE_KEY_LISTS = 'todo_lists';
export const STORAGE_KEY_SOUND_ENABLED = 'todo_sound_enabled';

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

export function expireStaleMyDayTasks(
  tasks: Task[],
  todayStr: string = getLocalDateString()
): { tasks: Task[]; changed: boolean } {
  let changed = false;
  const updated = tasks.map((t) => {
    if (t.inMyDay && (!t.myDayDate || t.myDayDate < todayStr)) {
      changed = true;
      return { ...t, inMyDay: false, myDayDate: null };
    }
    return t;
  });
  return { tasks: changed ? updated : tasks, changed };
}

export function loadStoredTasks(customCurrentDate?: string | Date): Task[] {
  const loaded = loadFromStorage(STORAGE_KEY_TASKS, DEFAULT_TASKS, (data) => Array.isArray(data));
  const todayStr =
    typeof customCurrentDate === 'string'
      ? customCurrentDate
      : getLocalDateString(customCurrentDate);
  const { tasks: migrated, changed } = expireStaleMyDayTasks(loaded, todayStr);
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
  return ensureSystemLists(loaded);
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
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  selectedTask: Task | null;
  addTask: (title: string, optionsOrListId?: string | AddTaskOptions) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  toggleImportant: (id: string) => void;
  toggleMyDay: (id: string) => void;
  addStep: (taskId: string, title: string) => void;
  toggleStep: (taskId: string, stepId: string) => void;
  deleteStep: (taskId: string, stepId: string) => void;
  setTaskNotes: (taskId: string, notes: string) => void;
  setTaskDueDate: (taskId: string, dueDate: string | null) => void;
  checkMidnightRollover: (customCurrentDate?: string | Date) => boolean;
  addList: (data: CreateTodoListInput) => TodoList;
  updateList: (id: string, updates: UpdateTodoListInput) => void;
  deleteList: (id: string) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  exportBackup: () => BackupData;
  importBackup: (backupInput: string | unknown) => { success: boolean; error?: string };
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

interface TodoProviderProps {
  children: React.ReactNode;
  initialTasks?: Task[];
  initialLists?: TodoList[];
  initialCurrentList?: TodoList;
  initialSoundEnabled?: boolean;
}

export const TodoProvider: React.FC<TodoProviderProps> = ({
  children,
  initialTasks,
  initialLists,
  initialCurrentList,
  initialSoundEnabled,
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof initialSoundEnabled === 'boolean') return initialSoundEnabled;
    return loadFromStorage(STORAGE_KEY_SOUND_ENABLED, true, (data) => typeof data === 'boolean');
  });

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((t) => t.id === selectedTaskId) ?? null;
  }, [tasks, selectedTaskId]);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const checkMidnightRollover = useCallback((customCurrentDate?: string | Date): boolean => {
    const todayStr =
      typeof customCurrentDate === 'string'
        ? customCurrentDate
        : getLocalDateString(customCurrentDate);

    const { tasks: updated, changed } = expireStaleMyDayTasks(tasksRef.current, todayStr);
    if (changed) {
      tasksRef.current = updated;
      setTasks(updated);
      return true;
    }
    return false;
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

    const handleFocus = () => {
      checkMidnightRollover();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
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

  // Synchronize soundEnabled to localStorage whenever soundEnabled changes
  useEffect(() => {
    saveToStorage(STORAGE_KEY_SOUND_ENABLED, soundEnabled);
  }, [soundEnabled]);

  const currentTasks = useMemo(() => {
    const todayStr = getLocalDateString();
    if (currentList.id === MY_DAY_LIST.id) {
      return tasks.filter((t) => Boolean(t.inMyDay) && (!t.myDayDate || t.myDayDate >= todayStr));
    }
    if (currentList.id === IMPORTANT_LIST.id) {
      return tasks.filter((t) => Boolean(t.isImportant));
    }
    return tasks.filter((t) => (t.listId ?? DEFAULT_LIST.id) === currentList.id);
  }, [tasks, currentList.id]);

  const addTask = useCallback(
    (title: string, optionsOrListId?: string | AddTaskOptions) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      const options: AddTaskOptions =
        typeof optionsOrListId === 'string'
          ? { listId: optionsOrListId }
          : (optionsOrListId ?? {});

      const isImportantView = currentList.id === IMPORTANT_LIST.id;
      const isMyDayView = currentList.id === MY_DAY_LIST.id;
      const targetListId =
        options.listId ??
        (isImportantView || isMyDayView ? DEFAULT_LIST.id : currentList.id);

      const isImportant =
        options.isImportant !== undefined ? options.isImportant : isImportantView;
      const inMyDay =
        options.inMyDay !== undefined ? options.inMyDay : isMyDayView;

      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: trimmed,
        completed: false,
        isImportant,
        inMyDay,
        myDayDate: inMyDay ? getLocalDateString() : null,
        dueDate: options.dueDate ?? null,
        steps: [],
        listId: targetListId,
        createdAt: new Date().toISOString(),
      };

      setTasks((prev) => [...prev, newTask]);
    },
    [currentList.id]
  );

  const triggerCompletionFeedback = useCallback((isCurrentlyCompleted?: boolean) => {
    if (isCurrentlyCompleted === false) {
      triggerCompletionSensory({ soundEnabled: soundEnabledRef.current });
    }
  }, []);

  const toggleTask = useCallback((id: string) => {
    const target = tasksRef.current.find((t) => t.id === id);
    triggerCompletionFeedback(target?.completed);

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, [triggerCompletionFeedback]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTaskId((prev) => (prev === id ? null : prev));
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

  const addStep = useCallback((taskId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: trimmed,
      completed: false,
    };
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          steps: [...(t.steps ?? []), newStep],
        };
      })
    );
  }, []);

  const toggleStep = useCallback((taskId: string, stepId: string) => {
    const targetTask = tasksRef.current.find((t) => t.id === taskId);
    const targetStep = targetTask?.steps?.find((s) => s.id === stepId);
    triggerCompletionFeedback(targetStep?.completed);

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          steps: (t.steps ?? []).map((s) =>
            s.id === stepId ? { ...s, completed: !s.completed } : s
          ),
        };
      })
    );
  }, [triggerCompletionFeedback]);

  const deleteStep = useCallback((taskId: string, stepId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          steps: (t.steps ?? []).filter((s) => s.id !== stepId),
        };
      })
    );
  }, []);

  const setTaskNotes = useCallback((taskId: string, notes: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, notes } : t))
    );
  }, []);

  const setTaskDueDate = useCallback((taskId: string, dueDate: string | null) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, dueDate } : t))
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
    setSelectedTaskId((prev) => {
      if (!prev) return null;
      const targetTask = tasksRef.current.find((t) => t.id === prev);
      return targetTask?.listId === id ? null : prev;
    });
    setCurrentList((prev) => {
      if (prev.id === id) {
        return DEFAULT_LIST;
      }
      return prev;
    });
  }, []);

  const exportBackup = useCallback((): BackupData => {
    return createBackupPayload(lists, tasks);
  }, [lists, tasks]);

  const importBackup = useCallback(
    (backupInput: string | unknown): { success: boolean; error?: string } => {
      const validation =
        typeof backupInput === 'string'
          ? parseAndValidateBackup(backupInput)
          : validateBackupData(backupInput);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const { lists: importedLists, tasks: importedTasks } = validation.data;

      // Rehydrate lists and tasks in state
      setLists(importedLists);
      setTasks(importedTasks);
      tasksRef.current = importedTasks;

      // Direct synchronization to localStorage
      saveStoredLists(importedLists);
      saveStoredTasks(importedTasks);

      // Reset selected task if open
      setSelectedTaskId(null);

      // Ensure active currentList is valid
      setCurrentList((prev) => {
        const found = importedLists.find((l) => l.id === prev.id);
        return found ?? DEFAULT_LIST;
      });

      return { success: true };
    },
    []
  );

  return (
    <TodoContext.Provider
      value={{
        tasks,
        currentTasks,
        lists,
        currentList,
        setCurrentList,
        selectedTaskId,
        setSelectedTaskId,
        selectedTask,
        addTask,
        toggleTask,
        deleteTask,
        toggleImportant,
        toggleMyDay,
        addStep,
        toggleStep,
        deleteStep,
        setTaskNotes,
        setTaskDueDate,
        checkMidnightRollover,
        addList,
        updateList,
        deleteList,
        soundEnabled,
        setSoundEnabled,
        toggleSound,
        exportBackup,
        importBackup,
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
