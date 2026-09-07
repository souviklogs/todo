import React from 'react';
import { useViewport } from './hooks/useViewport';
import { DesktopGuard } from './components/DesktopGuard';
import { MobileShell } from './components/MobileShell';

interface AppProps {
  viewportWidth?: number;
}

export const App: React.FC<AppProps> = ({ viewportWidth }) => {
  const { isDesktop } = useViewport(viewportWidth);

  if (isDesktop) {
    return (
      <DesktopGuard>
        <MobileShell />
      </DesktopGuard>
    );
  }

  return <MobileShell />;
};

export default App;
