import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import type { Task, TodoList } from '../types/todo';

export const STORAGE_KEY_TASKS = 'todo_tasks';
export const STORAGE_KEY_LISTS = 'todo_lists';

export const DEFAULT_LIST: TodoList = {
  id: 'tasks',
  name: 'Tasks',
  icon: 'ListTodo',
  colorTheme: 'blue',
  isSystem: true,
};

export const DEFAULT_LISTS: TodoList[] = [
  DEFAULT_LIST,
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

export function loadStoredTasks(): Task[] {
  if (typeof window === 'undefined') return DEFAULT_TASKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (raw === null) {
      return DEFAULT_TASKS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse stored tasks:', err);
    return DEFAULT_TASKS;
  }
}

export function saveStoredTasks(tasks: Task[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.error('Failed to save tasks to localStorage:', err);
  }
}

export function loadStoredLists(): TodoList[] {
  if (typeof window === 'undefined') return DEFAULT_LISTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LISTS);
    if (raw === null) {
      return DEFAULT_LISTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_LISTS;
  } catch (err) {
    console.error('Failed to parse stored lists:', err);
    return DEFAULT_LISTS;
  }
}

export function saveStoredLists(lists: TodoList[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LISTS, JSON.stringify(lists));
  } catch (err) {
    console.error('Failed to save lists to localStorage:', err);
  }
}

interface TodoContextType {
  tasks: Task[];
  currentTasks: Task[];
  lists: TodoList[];
  setLists: React.Dispatch<React.SetStateAction<TodoList[]>>;
  currentList: TodoList;
  setCurrentList: (list: TodoList) => void;
  addTask: (title: string, listId?: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
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
    return loaded[0] ?? DEFAULT_LIST;
  });

  // Synchronize tasks to localStorage whenever tasks change
  useEffect(() => {
    saveStoredTasks(tasks);
  }, [tasks]);

  // Synchronize lists to localStorage whenever lists change
  useEffect(() => {
    saveStoredLists(lists);
  }, [lists]);

  const currentTasks = useMemo(
    () => tasks.filter((t) => (t.listId ?? 'tasks') === currentList.id),
    [tasks, currentList.id]
  );

  const addTask = useCallback((title: string, listId?: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: trimmed,
      completed: false,
      isImportant: false,
      steps: [],
      listId: listId ?? currentList.id,
      createdAt: new Date().toISOString(),
    };

    setTasks((prev) => [...prev, newTask]);
  }, [currentList.id]);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <TodoContext.Provider
      value={{
        tasks,
        currentTasks,
        lists,
        setLists,
        currentList,
        setCurrentList,
        addTask,
        toggleTask,
        deleteTask,
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
