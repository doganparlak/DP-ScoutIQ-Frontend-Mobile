import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';

type Lang = 'en' | 'tr';
type Ctx = { lang: Lang; setLang: (l: Lang) => Promise<void>; ready: boolean };

const LanguageContext = createContext<Ctx>({ lang: 'en', setLang: async () => {}, ready: false });

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = (await AsyncStorage.getItem('app.lang')) as Lang | null;
      const initial = stored || 'en';
      i18n.changeLanguage(initial);
      setLangState(initial);
      setReady(true);
    })();
  }, []);

  const setLang = async (l: Lang) => {
    setLangState(l);
    await AsyncStorage.setItem('app.lang', l);
    await i18n.changeLanguage(l);
  };

  return <LanguageContext.Provider value={{ lang, setLang, ready }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
