"use client";

import React, { createContext, useContext } from "react";
import type { LocalizedText } from "@/lib/content";

/**
 * Footer links for CMS-managed pages, handed down from the root layout.
 *
 * The root layout is a server component and fetches these with the Admin SDK, so
 * the links are present in the server-rendered HTML — which matters, because
 * legal pages need to be crawlable. A client-side fetch would leave them out of
 * the initial paint and out of the crawler's view.
 *
 * Only the fields the footer actually renders are passed, so the payload stays
 * small and nothing unpublished can leak into the page source.
 */
export interface FooterLink {
    slug: string;
    title: LocalizedText;
}

const SitePagesContext = createContext<FooterLink[]>([]);

export const useFooterLinks = () => useContext(SitePagesContext);

export function SitePagesProvider({
    links,
    children,
}: {
    links: FooterLink[];
    children: React.ReactNode;
}) {
    return <SitePagesContext.Provider value={links}>{children}</SitePagesContext.Provider>;
}
