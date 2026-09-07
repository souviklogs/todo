export interface Step {
  id: string;
  title: string;
  completed: boolean;
}

export interface StepProgress {
  total: number;
  completed: number;
  label: string;
}

export function getStepProgress(steps?: Step[]): StepProgress | null {
  if (!steps || steps.length === 0) return null;
  const total = steps.length;
  const completed = steps.filter((s) => s.completed).length;
  return {
    total,
    completed,
    label: `${completed} of ${total} ${total === 1 ? 'step' : 'steps'}`,
  };
}

export function getLocalDateString(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTomorrowDateString(todayInput?: Date | string | number): string {
  if (typeof todayInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayInput)) {
    const [y, m, d] = todayInput.split('-').map(Number);
    return getLocalDateString(new Date(y, m - 1, d + 1));
  }
  const date = todayInput ? new Date(todayInput) : new Date();
  date.setDate(date.getDate() + 1);
  return getLocalDateString(date);
}

export function getYesterdayDateString(todayInput?: Date | string | number): string {
  if (typeof todayInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todayInput)) {
    const [y, m, d] = todayInput.split('-').map(Number);
    return getLocalDateString(new Date(y, m - 1, d - 1));
  }
  const date = todayInput ? new Date(todayInput) : new Date();
  date.setDate(date.getDate() - 1);
  return getLocalDateString(date);
}

export interface DueDateInfo {
  label: string;
  isOverdue: boolean;
}

export function formatDueDateBadge(
  dueDate?: string | null,
  todayStr?: string
): DueDateInfo | null {
  if (!dueDate) return null;
  const currentToday = todayStr ?? getLocalDateString();
  const isOverdue = dueDate < currentToday;

  const tomorrowStr = getTomorrowDateString(currentToday);
  const yesterdayStr = getYesterdayDateString(currentToday);

  const [dueY, dueM, dueD] = dueDate.split('-').map(Number);
  const dueObj = new Date(dueY, dueM - 1, dueD);
  const monthName = dueObj.toLocaleDateString('en-US', { month: 'short' });
  const [currentY] = currentToday.split('-').map(Number);
  const shortDate = dueY === currentY ? `${monthName} ${dueD}` : `${monthName} ${dueD}, ${dueY}`;

  if (dueDate === currentToday) {
    return { label: 'Due Today', isOverdue: false };
  }
  if (dueDate === tomorrowStr) {
    return { label: 'Due Tomorrow', isOverdue: false };
  }
  if (dueDate === yesterdayStr) {
    return { label: 'Overdue, Yesterday', isOverdue: true };
  }
  if (isOverdue) {
    return { label: `Overdue, ${shortDate}`, isOverdue: true };
  }
  return { label: `Due ${shortDate}`, isOverdue: false };
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  isImportant?: boolean;
  inMyDay?: boolean;
  myDayDate?: string | null;
  dueDate?: string | null;
  notes?: string;
  steps?: Step[];
  listId?: string;
  createdAt: string;
}

export interface TodoList {
  id: string;
  name: string;
  icon: string;
  colorTheme: string;
  isSystem: boolean;
}

export interface CreateTodoListInput {
  name: string;
  icon?: string;
  colorTheme?: string;
}

export type UpdateTodoListInput = Partial<CreateTodoListInput>;

export interface AddTaskOptions {
  listId?: string;
  isImportant?: boolean;
  inMyDay?: boolean;
  dueDate?: string | null;
}
