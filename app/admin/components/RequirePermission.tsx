"use client";

import { Lock } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { ADMIN_ROLES, ROLE_LABELS, roleHasPermission, type AdminPermission } from "@/lib/admin/roles";
import { Panel, Spinner } from "./ui";

/**
 * Keeps a whole admin page behind one permission.
 *
 * The sidebar already hides links a role cannot use, and every API route
 * refuses calls it is not entitled to — but a page reached by typing its URL
 * still rendered its shell: the form, the static reference panels, the layout,
 * with only the data calls failing. Nothing leaked, and it still read as a page
 * someone was allowed to be on. This makes the answer the same from every
 * direction: hidden in the nav, refused by the API, and not drawn here.
 *
 * Waits for the role to resolve before deciding. Deciding on the initial null
 * would flash "no access" at every admin for the length of a token check.
 */
export default function RequirePermission({
    permission,
    children,
}: {
    permission: AdminPermission;
    children: React.ReactNode;
}) {
    const { loading, can } = useAdmin();

    if (loading) {
        return (
            <div className="p-16 flex justify-center">
                <Spinner className="w-5 h-5" />
            </div>
        );
    }

    if (!can(permission)) {
        // Which roles would open this — so the message says how to get in,
        // not just that you can't.
        const holders = ADMIN_ROLES.filter((role) => roleHasPermission(role, permission)).map((role) => ROLE_LABELS[role]);

        return (
            <Panel className="max-w-lg mx-auto mt-16 p-8 flex flex-col items-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ink-800 text-ink-400 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                </div>
                <p className="text-sm text-ink-100">This section is not available to your role.</p>
                <p className="text-xs text-ink-500">
                    It needs <span className="font-mono text-ink-400">{permission}</span>
                    {holders.length > 0 && <>, which {holders.length === 1 ? "only" : ""} {holders.join(" and ")} {holders.length === 1 ? "has" : "have"}.</>}
                </p>
            </Panel>
        );
    }

    return <>{children}</>;
}
