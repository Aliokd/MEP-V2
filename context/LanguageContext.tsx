"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import en from '../locales/en.json';
import no from '../locales/no.json';
import sv from '../locales/sv.json';
import { LOCALE_COOKIE, isLanguage, type Language } from '@/lib/i18n';

export type { Language };
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

const persist = (lang: Language) => {
  try {
    localStorage.setItem(LOCALE_COOKIE, lang);
  } catch (e) {
    console.warn('Failed to save veinote-lang to localStorage:', e);
  }
  // Middleware reads the cookie to decide whether an unprefixed public URL
  // should redirect to /no or /sv, so keep it in step with localStorage.
  document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
};

export function LanguageProvider({
  children,
  initialLanguage = 'en',
  localeFromUrl = false,
}: {
  children: React.ReactNode;
  /** Locale resolved on the server, from the URL prefix when there is one. */
  initialLanguage?: Language;
  /** True when the URL carried the locale, so server and client already agree. */
  localeFromUrl?: boolean;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  // With a locale in the URL the first paint is already correct. Without one
  // (platform/admin) the server rendered English and we must wait for
  // localStorage before switching, or hydration mismatches.
  const [resolved, setResolved] = useState(localeFromUrl);

  useEffect(() => {
    if (localeFromUrl) {
      persist(initialLanguage);
      return;
    }
    const saved = localStorage.getItem(LOCALE_COOKIE);
    if (isLanguage(saved)) setLanguageState(saved);
    setResolved(true);
  }, [localeFromUrl, initialLanguage]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    persist(lang);
  }, []);

  const activeLanguage: Language = resolved ? language : 'en';

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
