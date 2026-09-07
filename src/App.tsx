import React from 'react';
import { useViewport } from './hooks/useViewport';
import { DesktopGuard } from './components/DesktopGuard';
import { MobileShell } from './components/MobileShell';
import { TodoProvider } from './context/TodoContext';

interface AppProps {
  viewportWidth?: number;
}

export const App: React.FC<AppProps> = ({ viewportWidth }) => {
  const { isDesktop } = useViewport(viewportWidth);

  return (
    <TodoProvider>
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
