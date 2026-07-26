import type { Metadata } from "next";
import { AdminProvider } from "@/context/AdminContext";
import AdminGate from "./components/AdminGate";
import AdminShell from "./components/AdminShell";

export const metadata: Metadata = {
    title: "Veinote Admin",
    // The console must never be indexed, and it should not leak referrers to
    // third parties when an admin follows a link out of a report.
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
};

/**
 * The admin console deliberately sits outside /platform so none of the platform
 * chrome (sidebar, Mind Power panel, light theme) applies. Copy here is
 * English-only by design — it's an internal tool, not a localized product surface.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminProvider>
            <AdminGate>
                <AdminShell>{children}</AdminShell>
            </AdminGate>
        </AdminProvider>
    );
}
