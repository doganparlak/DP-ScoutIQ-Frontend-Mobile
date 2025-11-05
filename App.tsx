// App.tsx
import React from 'react';
import RootNavigator from '@/navigation/RootNavigator';
import '@/i18n'; 
import { LanguageProvider } from '@/context/LanguageProvider';

export default function App() {
  return (
    <LanguageProvider>
      <RootNavigator />
    </LanguageProvider>
  );
}