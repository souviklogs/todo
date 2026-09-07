export interface Step {
  id: string;
  title: string;
  completed: boolean;
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
