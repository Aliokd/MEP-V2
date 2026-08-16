import "server-only";
import en from "@/locales/en.json";
import no from "@/locales/no.json";
import sv from "@/locales/sv.json";

export type EmailLocale = "en" | "no" | "sv";

type TranslationTree = { [key: string]: unknown };

const translations: Record<EmailLocale, TranslationTree> = { en, no, sv };

function resolve(tree: TranslationTree, keys: string[]): unknown {
    let result: unknown = tree;
    for (const key of keys) {
        if (typeof result !== "object" || result === null) return undefined;
        result = (result as TranslationTree)[key];
    }
    return result;
}

function lookup(tree: TranslationTree, keys: string[]): string | undefined {
    const value = resolve(tree, keys);
    return typeof value === "string" ? value : undefined;
}

/**
 * Admin-authored overrides keyed by translation path, from lib/siteCopy.ts.
 * Passing these lets an editor change email wording without a deploy, using the
 * same store that already overrides on-site copy — rather than a second,
 * parallel template system that would drift from it.
 */
export type EmailCopyOverrides = Record<string, Partial<Record<EmailLocale, string>>>;

// Server-safe re-implementation of context/LanguageContext.tsx's t() dot-notation lookup —
// that hook is "use client"/localStorage-bound and can't run in an API route.
export function tServer(locale: EmailLocale, keyPath: string, overrides?: EmailCopyOverrides): string {
    // An override wins, but only in the language asked for or English: a
    // Norwegian rewrite must not surface in a Swedish email just because it exists.
    const override = overrides?.[keyPath];
    const overridden = override?.[locale] || override?.en;
    if (typeof overridden === "string" && overridden.trim()) return overridden;

    const keys = keyPath.split(".");
    return lookup(translations[locale] ?? translations.en, keys) ?? lookup(translations.en, keys) ?? keyPath;
}

/**
 * Same lookup for a key holding an array of strings — the invite email's feature
 * list. Falls back to English rather than to an empty list: a feature list is the
 * point of that email, and shipping it blank is worse than shipping it untranslated.
 */
export function tServerList(locale: EmailLocale, keyPath: string): string[] {
    const keys = keyPath.split(".");
    const asList = (value: unknown): string[] | undefined =>
        Array.isArray(value) && value.every((item) => typeof item === "string")
            ? (value as string[])
            : undefined;

    return (
        asList(resolve(translations[locale] ?? translations.en, keys)) ??
        asList(resolve(translations.en, keys)) ??
        []
    );
}

export function resolveLocale(value: unknown): EmailLocale {
    return value === "no" || value === "sv" ? value : "en";
}
