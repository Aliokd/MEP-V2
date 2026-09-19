"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import en from '../locales/en.json';
import { LOCALE_COOKIE, isLanguage, type Language } from '@/lib/i18n';

export type { Language };

type Bundle = Record<string, any>;

/*
 * Only English is compiled into the client bundle: it is the fallback every
 * lookup can end on, so it has to be there synchronously. Swedish and
 * Norwegian reach the browser one of two ways, and never as part of the JS
 * every visitor downloads:
 * - the root layout passes the active locale's bundle into the server render
 *   (`initialMessages`), so a /sv page hydrates in Swedish without waiting on
 *   a download and without a mismatch against the server HTML;
 * - switching in place (the platform, where the URL carries no locale) fetches
 *   the new locale's bundle on demand and only then flips the language, so
 *   `language` and the strings never disagree.
 * Loaded bundles are kept at module level so a remount never refetches.
 */
const loaded: Partial<Record<Language, Bundle>> = { en };
const inflight: Partial<Record<Language, Promise<Bundle>>> = {};
const loaders: Record<Language, () => Promise<Bundle>> = {
  en: () => Promise.resolve(en),
  no: () => import('../locales/no.json').then((m) => m.default),
  sv: () => import('../locales/sv.json').then((m) => m.default),
};

function loadBundle(lang: Language): Promise<Bundle> {
  const ready = loaded[lang];
  if (ready) return Promise.resolve(ready);
  let pending = inflight[lang];
  if (!pending) {
    pending = loaders[lang]().then((bundle) => {
      loaded[lang] = bundle;
      delete inflight[lang];
      return bundle;
    }, (err) => {
      delete inflight[lang];
      throw err;
    });
    inflight[lang] = pending;
  }
  return pending;
}

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
  copyOverrides,
  initialMessages,
}: {
  children: React.ReactNode;
  /** Locale resolved on the server, from the URL prefix when there is one. */
  initialLanguage?: Language;
  /** True when the URL carried the locale, so server and client already agree. */
  localeFromUrl?: boolean;
  /**
   * Admin-authored overrides keyed by translation path, fetched server-side in
   * the root layout. Lets the copy inside code-built pages (the homepage,
   * /about) be edited in the CMS without moving their layouts out of code.
   */
  copyOverrides?: Record<string, Partial<Record<Language, string>>>;
  /**
   * The active locale's bundle, when it is not English. Comes from the root
   * layout's server render so the first paint already speaks the language;
   * see the note on `loaded` above.
   */
  initialMessages?: Bundle;
}) {
  // Seeded before the first render on both server and client, so the state
  // below starts identical on both sides and hydration matches. Idempotent.
  if (initialMessages && !loaded[initialLanguage]) loaded[initialLanguage] = initialMessages;

  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [messages, setMessages] = useState<Partial<Record<Language, Bundle>>>(() => ({ ...loaded }));
  // The language most recently asked for. A slow download for one language
  // must not overtake a later request for another.
  const wantedRef = useRef<Language>(initialLanguage);

  // Resolves to the bundle for `lang`, fetching it if this is the first time
  // it is needed. `onReady` runs only if no later request superseded this one.
  const withBundle = useCallback((lang: Language, onReady: () => void) => {
    wantedRef.current = lang;
    if (loaded[lang]) {
      onReady();
      return;
    }
    loadBundle(lang).then((bundle) => {
      if (wantedRef.current !== lang) return;
      setMessages((prev) => (prev[lang] ? prev : { ...prev, [lang]: bundle }));
      onReady();
    }).catch((err) => {
      console.error(`Failed to load the ${lang} translations:`, err);
    });
  }, []);
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
    const target = isLanguage(saved) ? saved : initialLanguage;
    // English until the saved language's bundle is in hand, then both the
    // language and its strings switch together.
    withBundle(target, () => {
      setLanguageState(target);
      setResolved(true);
    });
  }, [localeFromUrl, initialLanguage, withBundle]);

  const setLanguage = useCallback((lang: Language) => {
    persist(lang);
    withBundle(lang, () => setLanguageState(lang));
  }, [withBundle]);

  const activeLanguage: Language = resolved ? language : 'en';

  const lookup = useCallback((keyPath: string): any => {
    // A published override wins over the locale files, but only in the language
    // asked for or English - a Norwegian override must not surface on the
    // Swedish page just because it exists.
    const override = copyOverrides?.[keyPath];
    const overridden = override?.[activeLanguage] || override?.en;
    if (typeof overridden === 'string' && overridden.trim()) return overridden;

    const keys = keyPath.split('.');
    const value = resolve(messages[activeLanguage], keys);
    return value !== undefined ? value : resolve(en, keys);
  }, [activeLanguage, copyOverrides, messages]);

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
