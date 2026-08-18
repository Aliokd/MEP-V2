"use client";

import ErrorScreen from '@/components/ErrorScreen';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Split out from not-found.tsx so the route file can stay a server component
 * and keep its metadata export; the copy needs the client language context.
 */
export default function NotFoundScreen() {
    const { t } = useLanguage();
    return <ErrorScreen code={t('not_found.code')} title={t('not_found.title')} />;
}
