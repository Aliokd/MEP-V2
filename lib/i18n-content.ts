import en from '@/locales/en.json';
import no from '@/locales/no.json';
import sv from '@/locales/sv.json';
import type { Language } from './i18n';

// Deliberately separate from lib/i18n.ts, which the edge proxy also imports —
// keeping the (much larger) locale JSON out of that shared file keeps the
// proxy's bundle small. Only server components that render translated copy
// directly (no client LanguageProvider involved) need this.
const BUNDLES: Record<Language, any> = { en, no, sv };

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

/** Server-side equivalent of the client LanguageContext's t() — same fallback-to-English behavior. */
export function getServerT(language: Language) {
    return function t(keyPath: string): string {
        const keys = keyPath.split('.');
        const value = resolve(BUNDLES[language], keys) ?? resolve(BUNDLES.en, keys);
        return typeof value === 'string' ? value : keyPath;
    };
}

export function getServerTList<T = any>(language: Language, keyPath: string): T[] {
    const keys = keyPath.split('.');
    const value = resolve(BUNDLES[language], keys) ?? resolve(BUNDLES.en, keys);
    return Array.isArray(value) ? value : [];
}
