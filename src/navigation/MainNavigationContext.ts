import { createContext, useContext } from 'react';

export const MainNavigationContext = createContext(false);
export const useMainNavigation = () => useContext(MainNavigationContext);
