import { MoonIcon, SunIcon } from '@heroicons/react/16/solid';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light',
    );
  }, [isDark]);

  return (
    <div>
      <div className="fixed top-4 right-4 z-50">
        <button
          type="button"
          className="heroui-button heroui-button-secondary flex items-center gap-2"
          onClick={() => setIsDark(!isDark)}
        >
          {isDark ? (
            <>
              <SunIcon className="w-4 h-4" />
              Light
            </>
          ) : (
            <>
              <MoonIcon className="w-4 h-4" />
              Dark
            </>
          )}
        </button>
      </div>
      {children}
    </div>
  );
};

export default ThemeProvider;
