import React, { createContext, useContext } from 'react';
import './styles/space-theme.css';

// Space Theme Context
const SpaceThemeContext = createContext({
  isSpaceTheme: true,
});

/**
 * Provider component that wraps children with space theme
 * Imports the space-theme.css and provides theme context
 */
export function SpaceThemeProvider({ children }) {
  return (
    <SpaceThemeContext.Provider value={{ isSpaceTheme: true }}>
      {children}
    </SpaceThemeContext.Provider>
  );
}

/**
 * Hook to access space theme context
 */
export function useSpaceTheme() {
  return useContext(SpaceThemeContext);
}

export default SpaceThemeProvider;
