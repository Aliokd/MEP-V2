import "server-only";
import en from "@/locales/en.json";
import no from "@/locales/no.json";
import sv from "@/locales/sv.json";

export type EmailLocale = "en" | "no" | "sv";

type TranslationTree = { [key: string]: unknown };

const translations: Record<EmailLocale, TranslationTree> = { en, no, sv };

function lookup(tree: TranslationTree, keys: string[]): string | undefined {
    let result: unknown = tree;
    for (const key of keys) {
        if (typeof result !== "object" || result === null) return undefined;
        result = (result as TranslationTree)[key];
    }
    return typeof result === "string" ? result : undefined;
}

// Server-safe re-implementation of context/LanguageContext.tsx's t() dot-notation lookup —
// that hook is "use client"/localStorage-bound and can't run in an API route.
export function tServer(locale: EmailLocale, keyPath: string): string {
    const keys = keyPath.split(".");
    return lookup(translations[locale] ?? translations.en, keys) ?? lookup(translations.en, keys) ?? keyPath;
}

export function resolveLocale(value: unknown): EmailLocale {
    return value === "no" || value === "sv" ? value : "en";
}
