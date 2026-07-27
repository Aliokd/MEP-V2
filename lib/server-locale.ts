import { headers } from 'next/headers';
import { LANG_HEADER, PATH_HEADER, isLanguage, isLocalizedPath, type Language } from './i18n';

/**
 * Reads the locale the proxy resolved for this request. Shared by every server
 * component that needs to render in the visitor's language — the root layout,
 * and any localized page that renders its own copy server-side (about, privacy,
 * reset-password) rather than through the client LanguageProvider.
 */
export async function resolveServerLocale(): Promise<{ language: Language; path: string; fromUrl: boolean }> {
    const h = await headers();
    const headerLang = h.get(LANG_HEADER);
    const language: Language = isLanguage(headerLang) ? headerLang : 'en';
    const path = h.get(PATH_HEADER) || '/';
    return { language, path, fromUrl: isLocalizedPath(path) };
}
