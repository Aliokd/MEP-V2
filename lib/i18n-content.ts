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

/** Admin-authored overrides keyed by translation path — see lib/siteCopy.ts. */
export type CopyOverrideMap = Record<string, Partial<Record<Language, string>>>;

/**
 * Server-side equivalent of the client LanguageContext's t() — same
 * fallback-to-English behavior, plus optional CMS overrides.
 *
 * Overrides win over the locale files, but only for the language asked for or
 * English: a Norwegian override must not leak into the Swedish page just
 * because it exists.
 */
export function getServerT(language: Language, overrides?: CopyOverrideMap) {
    return function t(keyPath: string): string {
        const override = overrides?.[keyPath];
        const overridden = override?.[language] || override?.en;
        if (typeof overridden === 'string' && overridden.trim()) return overridden;

        const keys = keyPath.split('.');
        const value = resolve(BUNDLES[language], keys) ?? resolve(BUNDLES.en, keys);
        return typeof value === 'string' ? value : keyPath;
    };
}

/**
 * Every translation key under the given namespaces that holds a plain string,
 * with its English value. Drives the admin's Site copy list, so the editable
 * keys are derived from the locale file rather than hand-maintained.
 */
export function listCopyKeys(namespaces: string[]): { key: string; value: string }[] {
    const found: { key: string; value: string }[] = [];

    const walk = (node: any, path: string) => {
        if (typeof node === 'string') {
            found.push({ key: path, value: node });
            return;
        }
        // Arrays are skipped: the only one is the Q&A list, which has its own editor.
        if (!node || typeof node !== 'object' || Array.isArray(node)) return;
        Object.entries(node).forEach(([key, child]) => walk(child, path ? `${path}.${key}` : key));
    };

    namespaces.forEach((namespace) => {
        const node = resolve(BUNDLES.en, namespace.split('.'));
        if (node !== undefined) walk(node, namespace);
    });

    return found;
}

export function getServerTList<T = any>(language: Language, keyPath: string): T[] {
    const keys = keyPath.split('.');
    const value = resolve(BUNDLES[language], keys) ?? resolve(BUNDLES.en, keys);
    return Array.isArray(value) ? value : [];
}
