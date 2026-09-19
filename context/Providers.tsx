"use client";

import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import { LanguageProvider } from "./LanguageContext";
import type { Language } from "@/lib/i18n";

export function Providers({
    children,
    initialLanguage,
    localeFromUrl,
    copyOverrides,
    initialMessages,
}: {
    children: React.ReactNode;
    initialLanguage?: Language;
    localeFromUrl?: boolean;
    copyOverrides?: Record<string, Partial<Record<Language, string>>>;
    /** The active locale's bundle when it is not English; see LanguageContext. */
    initialMessages?: Record<string, any>;
}) {
    return (
        <AuthProvider>
            <ThemeProvider>
                <LanguageProvider
                    initialLanguage={initialLanguage}
                    localeFromUrl={localeFromUrl}
                    copyOverrides={copyOverrides}
                    initialMessages={initialMessages}
                >
                    {children}
                </LanguageProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
