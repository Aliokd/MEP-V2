import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { auditContext, writeAudit } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ uid: string }> };

/**
 * GDPR data access request: everything Veinote holds about one person, as JSON.
 * The export itself is audited — a subject access request is a privileged read
 * of someone's entire account, and it should be as traceable as a deletion.
 */
export const GET = withAdmin("users.delete", async (request, admin, ctx: Ctx) => {
    const { uid } = await ctx.params;

    const [profile, authRecord, projects, posts, feedback, support, reports] = await Promise.all([
        adminDb.collection("users").doc(uid).get(),
        adminAuth.getUser(uid).catch(() => null),
        adminDb.collection("projects").where("ownerId", "==", uid).get(),
        adminDb.collection("connect_posts").where("authorId", "==", uid).get(),
        adminDb.collection("user_feedback").where("userId", "==", uid).get().catch(() => null),
        adminDb.collection("support_tickets").where("userId", "==", uid).get().catch(() => null),
        adminDb.collection("reports").where("reporterId", "==", uid).get().catch(() => null),
    ]);

    if (!profile.exists && !authRecord) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const payload = {
        exportedAt: new Date().toISOString(),
        exportedBy: admin.email,
        uid,
        profile: profile.data() || null,
        account: authRecord
            ? {
                  email: authRecord.email,
                  emailVerified: authRecord.emailVerified,
                  displayName: authRecord.displayName,
                  disabled: authRecord.disabled,
                  providers: authRecord.providerData.map((p) => p.providerId),
                  createdAt: authRecord.metadata.creationTime,
                  lastSignInAt: authRecord.metadata.lastSignInTime,
              }
            : null,
        projects: projects.docs.map((d) => ({ id: d.id, ...d.data() })),
        communityPosts: posts.docs.map((d) => ({ id: d.id, ...d.data() })),
        feedback: feedback?.docs.map((d) => ({ id: d.id, ...d.data() })) || [],
        supportTickets: support?.docs.map((d) => ({ id: d.id, ...d.data() })) || [],
        reportsFiled: reports?.docs.map((d) => ({ id: d.id, ...d.data() })) || [],
    };

    await writeAudit({
        actorUid: admin.uid,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "user.export",
        targetType: "user",
        targetId: uid,
        targetLabel: profile.data()?.email || uid,
        ...auditContext(request),
    });

    return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="veinote-export-${uid}.json"`,
        },
    });
});
