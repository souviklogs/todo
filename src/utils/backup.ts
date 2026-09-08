import type { Task, TodoList, Step, BackupData } from '../types/todo';
import { getLocalDateString } from '../types/todo';
import { MY_DAY_LIST, DEFAULT_LIST, IMPORTANT_LIST } from '../constants/lists';

// Backwards-compatible aliases
export const SYSTEM_MY_DAY_LIST: TodoList = MY_DAY_LIST;
export const SYSTEM_TASKS_LIST: TodoList = DEFAULT_LIST;
export const SYSTEM_IMPORTANT_LIST: TodoList = IMPORTANT_LIST;

export type BackupValidationResult =
  | { valid: true; data: BackupData }
  | { valid: false; error: string };

/**
 * Ensures required system lists (My Day, Tasks, Important) are preserved in canonical order.
 */
export function ensureSystemLists(lists: TodoList[]): TodoList[] {
  const result = [...lists];

  // 1. Ensure My Day is at index 0
  const myDayIdx = result.findIndex((l) => l.id === MY_DAY_LIST.id);
  const myDayItem = myDayIdx !== -1 ? result.splice(myDayIdx, 1)[0] : MY_DAY_LIST;
  result.unshift({ ...myDayItem, isSystem: true });

  // 2. Ensure Tasks is at index 1
  const tasksIdx = result.findIndex((l) => l.id === DEFAULT_LIST.id);
  const tasksItem = tasksIdx !== -1 ? result.splice(tasksIdx, 1)[0] : DEFAULT_LIST;
  result.splice(1, 0, { ...tasksItem, isSystem: true });

  // 3. Ensure Important is at index 2
  const importantIdx = result.findIndex((l) => l.id === IMPORTANT_LIST.id);
  const importantItem = importantIdx !== -1 ? result.splice(importantIdx, 1)[0] : IMPORTANT_LIST;
  result.splice(2, 0, { ...importantItem, isSystem: true });

  return result;
}

/**
 * Validates raw data to ensure it adheres to the BackupData schema.
 */
export function validateBackupData(data: unknown): BackupValidationResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      error: 'Invalid backup file: Root element must be a valid JSON object.',
    };
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.lists)) {
    return {
      valid: false,
      error: "Invalid backup file: Missing or invalid 'lists' array.",
    };
  }

  if (!Array.isArray(obj.tasks)) {
    return {
      valid: false,
      error: "Invalid backup file: Missing or invalid 'tasks' array.",
    };
  }

  // Validate list items
  for (let i = 0; i < obj.lists.length; i++) {
    const item = obj.lists[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return {
        valid: false,
        error: `Invalid list at index ${i}: Expected a list object.`,
      };
    }
    const l = item as Record<string, unknown>;
    if (typeof l.id !== 'string' || !l.id.trim()) {
      return {
        valid: false,
        error: `Invalid list at index ${i}: 'id' must be a non-empty string.`,
      };
    }
    if (typeof l.name !== 'string' || !l.name.trim()) {
      return {
        valid: false,
        error: `Invalid list at index ${i}: 'name' must be a non-empty string.`,
      };
    }
  }

  // Validate task items
  for (let i = 0; i < obj.tasks.length; i++) {
    const item = obj.tasks[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return {
        valid: false,
        error: `Invalid task at index ${i}: Expected a task object.`,
      };
    }
    const t = item as Record<string, unknown>;
    if (typeof t.id !== 'string' || !t.id.trim()) {
      return {
        valid: false,
        error: `Invalid task at index ${i}: 'id' must be a non-empty string.`,
      };
    }
    if (typeof t.title !== 'string') {
      return {
        valid: false,
        error: `Invalid task at index ${i}: 'title' must be a string.`,
      };
    }
    if (typeof t.completed !== 'boolean') {
      return {
        valid: false,
        error: `Invalid task at index ${i}: 'completed' must be a boolean.`,
      };
    }
    if (t.steps !== undefined) {
      if (!Array.isArray(t.steps)) {
        return {
          valid: false,
          error: `Invalid task '${t.id}': 'steps' must be an array.`,
        };
      }
      for (let j = 0; j < t.steps.length; j++) {
        const step = t.steps[j];
        if (!step || typeof step !== 'object' || Array.isArray(step)) {
          return {
            valid: false,
            error: `Invalid step at index ${j} in task '${t.id}': Expected an object.`,
          };
        }
        const s = step as Record<string, unknown>;
        if (
          typeof s.id !== 'string' ||
          typeof s.title !== 'string' ||
          typeof s.completed !== 'boolean'
        ) {
          return {
            valid: false,
            error: `Invalid step at index ${j} in task '${t.id}': Missing required step fields.`,
          };
        }
      }
    }
  }

  const sanitizedLists: TodoList[] = obj.lists.map((item) => {
    const l = item as Record<string, unknown>;
    return {
      id: String(l.id),
      name: String(l.name),
      icon: typeof l.icon === 'string' ? l.icon : '📋',
      colorTheme: typeof l.colorTheme === 'string' ? l.colorTheme : 'blue',
      isSystem: Boolean(l.isSystem),
    };
  });

  const sanitizedTasks: Task[] = obj.tasks.map((item) => {
    const t = item as Record<string, unknown>;
    const steps: Step[] | undefined = Array.isArray(t.steps)
      ? t.steps.map((s) => {
          const stepObj = s as Record<string, unknown>;
          return {
            id: String(stepObj.id),
            title: String(stepObj.title),
            completed: Boolean(stepObj.completed),
          };
        })
      : undefined;

    return {
      id: String(t.id),
      title: String(t.title),
      completed: Boolean(t.completed),
      isImportant: t.isImportant !== undefined ? Boolean(t.isImportant) : undefined,
      inMyDay: t.inMyDay !== undefined ? Boolean(t.inMyDay) : undefined,
      myDayDate: typeof t.myDayDate === 'string' ? t.myDayDate : null,
      dueDate: typeof t.dueDate === 'string' ? t.dueDate : null,
      notes: typeof t.notes === 'string' ? t.notes : undefined,
      steps,
      listId: typeof t.listId === 'string' ? t.listId : SYSTEM_TASKS_LIST.id,
      createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
    };
  });

  return {
    valid: true,
    data: {
      version: typeof obj.version === 'number' ? obj.version : 1,
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
      lists: ensureSystemLists(sanitizedLists),
      tasks: sanitizedTasks,
    },
  };
}

/**
 * Parses a JSON backup string and validates its schema.
 */
export function parseAndValidateBackup(jsonString: string): BackupValidationResult {
  const trimmed = jsonString.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Backup file is empty.',
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return validateBackupData(parsed);
  } catch (err) {
    return {
      valid: false,
      error: `Invalid JSON format: ${err instanceof Error ? err.message : 'failed to parse JSON'}`,
    };
  }
}

/**
 * Creates clean formatted JSON backup data containing all lists and tasks.
 */
export function createBackupPayload(lists: TodoList[], tasks: Task[]): BackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    lists: ensureSystemLists(lists),
    tasks,
  };
}

/**
 * Triggers a browser download of a formatted JSON backup file.
 */
export function downloadBackupFile(backupData: BackupData, filename?: string): void {
  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const dateStr = getLocalDateString();
  const targetFilename = filename || `todo-backup-${dateStr}.json`;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  let url = '';
  const hasCreateObjectURL =
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';

  if (hasCreateObjectURL) {
    url = URL.createObjectURL(blob);
  } else {
    url = `data:application/json;charset=utf-8,${encodeURIComponent(jsonString)}`;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = targetFilename;
  link.setAttribute('data-testid', 'download-backup-anchor');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (hasCreateObjectURL && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }
}

/**
 * Reads file content as text, using file.text() with fallback to FileReader.
 */
export async function readBackupFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return await file.text();
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Error reading backup file'));
    reader.readAsText(file);
  });
}
