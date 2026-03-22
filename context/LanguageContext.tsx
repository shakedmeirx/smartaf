import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppLanguage, setAppLanguage } from '@/locales';

const STORAGE_KEY = 'app_language';

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue>({
  language: 'he',
  setLanguage: async () => {},
});

type Props = {
  children: (key: number) => React.ReactNode;
};

export function LanguageProvider({ children }: Props) {
  const [language, setLanguageState] = useState<AppLanguage>('he');
  // Incrementing this key forces a full re-mount of the children tree,
  // which makes every component re-read the updated module-level `strings`.
  const [rootKey, setRootKey] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      const lang: AppLanguage = stored === 'en' ? 'en' : 'he';
      setAppLanguage(lang);
      setLanguageState(lang);
    });
  }, []);

  const setLanguage = useCallback(async (lang: AppLanguage) => {
    setAppLanguage(lang);
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEY, lang);
    setRootKey(k => k + 1);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children(rootKey)}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
