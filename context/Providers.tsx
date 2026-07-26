"use client";

import { AuthProvider } from "./AuthContext";
import { ThemeProvider } from "./ThemeContext";
import { LanguageProvider } from "./LanguageContext";
import type { Language } from "@/lib/i18n";

export function Providers({
    children,
    initialLanguage,
    localeFromUrl,
}: {
    children: React.ReactNode;
    initialLanguage?: Language;
    localeFromUrl?: boolean;
}) {
    return (
        <AuthProvider>
            <ThemeProvider>
                <LanguageProvider initialLanguage={initialLanguage} localeFromUrl={localeFromUrl}>
                    {children}
                </LanguageProvider>
            </ThemeProvider>
        </AuthProvider>
    );
}
