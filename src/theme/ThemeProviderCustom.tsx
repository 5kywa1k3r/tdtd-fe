import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { navyTheme, blueGrayTheme, forestSlateTheme } from './index';

type ThemeName = 'navy' | 'blueGray' | 'forest';

interface ThemeContextType {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeName: 'navy',
  setThemeName: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const ThemeProviderCustom = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    return (localStorage.getItem('appTheme') as ThemeName) || 'navy';
  });

  useEffect(() => {
    localStorage.setItem('appTheme', themeName);
  }, [themeName]);

  const theme = useMemo(() => {
    if (themeName === 'blueGray') return blueGrayTheme;
    if (themeName === 'forest') return forestSlateTheme;
    return navyTheme;
  }, [themeName]);

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  );
};
