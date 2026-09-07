import React from 'react';
import { useViewport } from './hooks/useViewport';
import { DesktopGuard } from './components/DesktopGuard';
import { MobileShell } from './components/MobileShell';
import { TodoProvider } from './context/TodoContext';

import type { Task, TodoList } from './types/todo';

interface AppProps {
  viewportWidth?: number;
  initialTasks?: Task[];
  initialLists?: TodoList[];
  initialCurrentList?: TodoList;
}

export const App: React.FC<AppProps> = ({
  viewportWidth,
  initialTasks,
  initialLists,
  initialCurrentList,
}) => {
  const { isDesktop } = useViewport(viewportWidth);

  return (
    <TodoProvider
      initialTasks={initialTasks}
      initialLists={initialLists}
      initialCurrentList={initialCurrentList}
    >
      {isDesktop ? (
        <DesktopGuard>
          <MobileShell />
        </DesktopGuard>
      ) : (
        <MobileShell />
      )}
    </TodoProvider>
  );
};

export default App;
