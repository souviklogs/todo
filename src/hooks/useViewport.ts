import { useState, useEffect } from 'react';

export function useViewport(overrideWidth?: number) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof overrideWidth === 'number') {
      return overrideWidth;
    }
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 1024;
  });

  useEffect(() => {
    if (typeof overrideWidth === 'number') {
      setWidth(overrideWidth);
      return;
    }

    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [overrideWidth]);

  return {
    width,
    isDesktop: width > 768,
  };
}
