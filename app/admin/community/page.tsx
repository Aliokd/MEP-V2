"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2, Undo2, Flag, MailX } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import { PageHeader, Panel, Badge, Button, Select, EmptyState, SkeletonRows, Spinner, timeAgo } from "../components/ui";

interface FeedPost {
    id: string;
    removed: boolean;
    author: string;
    authorId: string | null;
    projectName: string;
    body: string;
    lyrics: string[];
    attachment?: { name: string; url: string } | null;
    kudos?: number;
    commentCount?: number;
    reportCount: number;
    isSeed?: boolean;
    createdAt: number | null;
    removedAt?: number | null;
    removedByEmail?: string | null;
    removalReason?: string | null;
}

export default function CommunityPage() {
    const { adminFetch, can } = useAdmin();
    const [posts, setPosts] = useState<FeedPost[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [view, setView] = useState("recent");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);

    /** Plain-English outcome for each way the author notification can end. */
    const NOTIFY_MESSAGE: Record<string, string> = {
        sent: "Removed, and the author was emailed the reason.",
        "no-author-id":
            "Removed — but the author was NOT emailed. This post was shared before Veinote recorded who posted it, so there is no account to write to. If you know who it was, tell them yourself.",
        "no-account": "Removed — but the author was NOT emailed: their account no longer exists.",
        "no-email": "Removed — but the author was NOT emailed: there is no address on their account.",
        "send-failed":
            "Removed — but the email FAILED to send. Check the mail settings, then contact the author another way.",
        skipped: "Removed. No email was requested.",
    };

    const load = useCallback(async () => {
        setRefreshing(true);
        setError(null);
        try {
            const res = await adminFetch(`/api/admin/moderation/posts?view=${view}`);
            if (!res.ok) throw new Error((await res.json()).error || "Failed to load feed");
            setPosts((await res.json()).posts);
        } catch (err: any) {
            setError(err.message);
            setPosts([]);
        } finally {
            setRefreshing(false);
        }
    }, [adminFetch, view]);

    useEffect(() => {
        load();
    }, [load]);

    const act = async (post: FeedPost, action: "remove" | "restore") => {
        let reason = "";
        if (action === "remove") {
            // Say up front when the author cannot be reached, rather than letting
            // the moderator write a careful explanation nobody will ever receive.
            const reachable = Boolean(post.authorId);
            const input = window.prompt(
                reachable
                    ? `Remove this post from the feed?\n\nThe author is emailed this reason, so write it for them to read:`
                    : `Remove this post from the feed?\n\nNOTE: this post was shared before Veinote recorded who posted it, so nobody can be emailed about it. The reason is still kept in the audit log:`,
            );
            if (input === null) return;
            if (!input.trim()) {
                setError("A reason is required.");
                return;
            }
            reason = input;
        }

        setBusyId(post.id);
        setError(null);
        setNote(null);
        try {
            const res = await adminFetch("/api/admin/moderation/posts", {
                method: "POST",
                body: JSON.stringify({ postId: post.id, action, reason }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Action failed");

            setNote(
                action === "remove"
                    ? NOTIFY_MESSAGE[data.notifyStatus] || "Removed."
                    : "Restored to the feed.",
            );
            await load();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Community"
                description="The Connect feed as it stands. Removing a post moves it out of the feed collection entirely and emails the author the reason."
                action={
                    <div className="flex items-center gap-2">
                        <Select value={view} onChange={(e) => setView(e.target.value)}>
                            <option value="recent">Newest</option>
                            <option value="reported">Reported</option>
                            <option value="removed">Removed</option>
                        </Select>
                        <Button onClick={load} disabled={refreshing} size="sm">
                            {refreshing ? <Spinner className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            Refresh
                        </Button>
                    </div>
                }
            />

            {error && (
                <Panel className="p-4 border-red-500/30">
                    <p className="text-sm text-red-300">{error}</p>
                </Panel>
            )}

            {/* Whether the author was actually reached. This used to be silent:
                a post with no authorId skipped the email entirely and still
                reported success, so a removal looked identical either way. */}
            {note && (
                <Panel
                    className={`p-4 ${
                        note.includes("NOT") || note.includes("FAILED")
                            ? "border-gold-500/40 bg-gold-500/5"
                            : "border-green-500/30 bg-green-500/5"
                    }`}
                >
                    <p
                        className={`text-sm ${
                            note.includes("NOT") || note.includes("FAILED") ? "text-gold-200" : "text-green-200"
                        }`}
                    >
                        {note}
                    </p>
                </Panel>
            )}

            {!posts ? (
                <SkeletonRows rows={5} />
            ) : posts.length === 0 ? (
                <Panel>
                    <EmptyState
                        title={view === "removed" ? "Nothing has been removed" : view === "reported" ? "Nothing is reported" : "The feed is empty"}
                    />
                </Panel>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {posts.map((post) => (
                        <Panel key={post.id} className="p-4 flex flex-col gap-3">
                            <div className="flex items-start gap-2">
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm text-ink-100 truncate">{post.author}</span>
                                        {post.isSeed && <Badge tone="neutral">demo</Badge>}
                                        {post.reportCount > 0 && (
                                            <Badge tone="red"><Flag className="w-3 h-3" /> {post.reportCount}</Badge>
                                        )}
                                        {post.removed && <Badge tone="neutral">removed</Badge>}
                                        {!post.removed && !post.authorId && (
                                            <Badge tone="gold">
                                                <MailX className="w-3 h-3" /> no author on file
                                            </Badge>
                                        )}
                                    </div>
                                    <span className="text-xs text-ink-500 truncate">
                                        {post.projectName} · {timeAgo(post.createdAt)}
                                    </span>
                                </div>
                            </div>

                            {post.body && <p className="text-sm text-ink-300">{post.body}</p>}

                            {post.lyrics.length > 0 && (
                                <div className="p-3 rounded-xl bg-ink-800 border border-ink-600 flex flex-col gap-1 max-h-40 overflow-y-auto">
                                    {post.lyrics.slice(0, 8).map((line, i) => (
                                        <p key={i} className="text-xs text-ink-300">{line}</p>
                                    ))}
                                    {post.lyrics.length > 8 && (
                                        <p className="text-[11px] text-ink-500">+{post.lyrics.length - 8} more lines</p>
                                    )}
                                </div>
                            )}

                            {post.removed && post.removalReason && (
                                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                                    <p className="text-[11px] text-ink-500 mb-1">
                                        Removed {timeAgo(post.removedAt)} by {post.removedByEmail}
                                    </p>
                                    <p className="text-xs text-red-200">{post.removalReason}</p>
                                </div>
                            )}

                            {can("community.moderate") && (
                                <div className="flex items-center gap-2 pt-1 border-t border-ink-600 mt-auto">
                                    {post.removed ? (
                                        <Button size="sm" onClick={() => act(post, "restore")} disabled={busyId === post.id}>
                                            {busyId === post.id ? <Spinner className="w-3 h-3" /> : <Undo2 className="w-3.5 h-3.5" />}
                                            Restore to feed
                                        </Button>
                                    ) : (
                                        <Button size="sm" variant="danger" onClick={() => act(post, "remove")} disabled={busyId === post.id}>
                                            {busyId === post.id ? <Spinner className="w-3 h-3" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            Remove
                                        </Button>
                                    )}
                                    {post.authorId && (
                                        <a
                                            href={`/admin/users?uid=${post.authorId}`}
                                            className="text-xs text-ink-400 hover:text-ink-100 ml-auto"
                                        >
                                            Author profile
                                        </a>
                                    )}
                                </div>
                            )}
                        </Panel>
                    ))}
                </div>
            )}
        </div>
    );
}
