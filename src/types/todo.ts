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
