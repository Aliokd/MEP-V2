"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import no from '../locales/no.json';
import sv from '../locales/sv.json';

export type Language = 'en' | 'no' | 'sv';
const translations: Record<Language, any> = { en, no, sv };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('veinote-lang', lang);
    } catch (e) {
      console.warn('Failed to save veinote-lang to localStorage:', e);
    }
  };

  // Helper function to resolve dot-notation strings, e.g. "navigation.create"
  const t = (keyPath: string): string => {
    if (!mounted) return keyPath;
    
    const keys = keyPath.split('.');
    let result = translations[language];
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        // Fallback to English
        let fallback = translations['en'];
        for (const fKey of keys) {
          fallback = fallback?.[fKey];
        }
        return typeof fallback === 'string' ? fallback : keyPath;
      }
    }
    return typeof result === 'string' ? result : keyPath;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
