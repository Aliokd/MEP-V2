"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import en from '../locales/en.json';
import no from '../locales/no.json';
import sv from '../locales/sv.json';

export type Language = 'en' | 'no' | 'sv';
const translations: Record<Language, any> = { en, no, sv };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string) => string;
  tList: <T = any>(keyPath: string) => T[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Walks a dot-notation path ("navigation.create") through a translation bundle.
const resolve = (bundle: any, keys: string[]): any => {
  let result = bundle;
  for (const key of keys) {
    if (result && result[key] !== undefined) {
      result = result[key];
    } else {
      return undefined;
    }
  }
  return result;
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('veinote-lang') as Language;
    if (saved && ['en', 'no', 'sv'].includes(saved)) {
      setLanguageState(saved);
    }
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('veinote-lang', lang);
    } catch (e) {
      console.warn('Failed to save veinote-lang to localStorage:', e);
    }
  }, []);

  // Before mount we render English so the server and the first client paint
  // agree; the saved language takes over on the very next render.
  const activeLanguage = mounted ? language : 'en';

  const lookup = useCallback((keyPath: string): any => {
    const keys = keyPath.split('.');
    const value = resolve(translations[activeLanguage], keys);
    return value !== undefined ? value : resolve(translations['en'], keys);
  }, [activeLanguage]);

  const t = useCallback((keyPath: string): string => {
    const value = lookup(keyPath);
    return typeof value === 'string' ? value : keyPath;
  }, [lookup]);

  const tList = useCallback(<T,>(keyPath: string): T[] => {
    const value = lookup(keyPath);
    return Array.isArray(value) ? value : [];
  }, [lookup]);

  const value = useMemo(
    () => ({ language: activeLanguage, setLanguage, t, tList }),
    [activeLanguage, setLanguage, t, tList]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
