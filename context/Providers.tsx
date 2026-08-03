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
}: {
    children: React.ReactNode;
    initialLanguage?: Language;
    localeFromUrl?: boolean;
    copyOverrides?: Record<string, Partial<Record<Language, string>>>;
}) {
    return (
        <AuthProvider>
            <ThemeProvider>
                <LanguageProvider initialLanguage={initialLanguage} localeFromUrl={localeFromUrl} copyOverrides={copyOverrides}>
                    {children}
                </LanguageProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
