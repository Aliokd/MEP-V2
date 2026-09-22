/**
 * The transactional emails Veinote sends, described once so the admin console
 * and the server agree on what exists and what each one is for.
 *
 * No firebase or server-only imports — the Email page reads this directly.
 *
 * Their wording lives in the locale files under `email.*` and is overridden
 * through the same `site_copy` store that overrides on-site copy. That is why
 * there is no separate template body here: editing an email is editing those
 * keys, and this registry only says which keys belong to which email.
 */

export interface EmailTemplateDefinition {
    id: string;
    label: string;
    /** When this email is sent, in the words an admin would use. */
    whenSent: string;
    /** Locale key prefix — fields live under `email.<keyPrefix>.<field>`. */
    keyPrefix: string;
    /** Editable fields, in the order they appear in the email. */
    fields: string[];
    /** Fields holding a list rather than a single string; edited one per line. */
    listFields?: string[];
    /** Placeholders the template substitutes, for the editor's guidance. */
    variables: string[];
    /** True when the email carries a password, so the UI can warn about test sends. */
    carriesPassword?: boolean;
}

export const EMAIL_TEMPLATES: EmailTemplateDefinition[] = [
    {
        id: "welcome",
        label: "Welcome",
        whenSent: "When someone creates an account, and from the New user dialog.",
        keyPrefix: "welcome",
        fields: ["subject", "greeting", "body_1", "body_2", "cta", "signoff", "team"],
        variables: ["name"],
    },
    {
        id: "verify_code",
        label: "Verification code",
        whenSent: "At the end of onboarding, once the card is in: the six-digit code that verifies the address.",
        keyPrefix: "verify_code",
        fields: ["subject", "greeting", "body", "expiry", "ignore", "team"],
        variables: ["code", "minutes"],
    },
    {
        id: "beta_welcome",
        label: "Beta tester invite",
        whenSent:
            "From the New user dialog when the beta option is chosen. Contains the account's password.",
        keyPrefix: "beta_welcome",
        fields: [
            "subject",
            "preheader",
            "greeting",
            "body_1",
            "body_2",
            "credentials_title",
            "credentials_email_label",
            "credentials_password_label",
            "credentials_note",
            "cta",
            "tasks_title",
            "task_1_title",
            "task_1_body",
            "task_2_title",
            "task_2_body",
            "task_3_title",
            "task_3_body",
            "task_4_title",
            "task_4_body",
            "early_note",
            "feedback",
            "signoff",
            "team",
            "contact",
        ],
        variables: ["name"],
        carriesPassword: true,
    },
    {
        id: "collab_invite",
        label: "Collaboration invite",
        whenSent: "When someone invites a person to work on a song with them.",
        keyPrefix: "collab_invite",
        fields: [
            "subject",
            "preheader",
            "preheader_waitlist",
            "greeting",
            "body_1",
            "body_2",
            // Shown instead of body_2/cta while signups are closed — the
            // wording that has to match the waiting list rather than the app.
            "body_2_waitlist",
            "features_title",
            "features",
            "cta",
            "cta_waitlist",
            "waitlist_note",
            "ignore",
            "signoff",
            "team",
        ],
        listFields: ["features"],
        variables: ["inviter", "project", "days"],
    },
    {
        id: "golden_ticket",
        label: "Golden ticket",
        whenSent:
            "When someone takes their ticket on their Golden program page, and from the Golden program console when an admin activates or sends one. Carries the code. The '_granted' wordings replace the others when the ticket is already on an existing account, where there is no code left to redeem; the console can also put a line of its own near the top and override the subject.",
        keyPrefix: "golden_ticket",
        fields: [
            "subject",
            "preheader",
            "badge",
            "greeting",
            "body_1",
            // The wording when an admin activated the ticket on an account
            // that already exists, so there is no code to redeem.
            "body_1_granted",
            "code_label",
            "code_label_granted",
            "body_2",
            "body_2_granted",
            "cta",
            "cta_granted",
            "benefits_title",
            "benefits",
            "page_line",
            "keep",
            "signoff",
            "team",
        ],
        listFields: ["benefits"],
        variables: ["name", "code", "invites"],
    },
    {
        id: "trial_ending",
        label: "Trial ending reminder",
        whenSent:
            "Automatically, the day before a no-card trial ends. Once per account. Card trials get Paddle's own reminder. Switched and run from the Automations tab.",
        keyPrefix: "trial_ending",
        fields: ["subject", "greeting", "greeting_named", "body", "keep", "cta", "team"],
        variables: ["name", "endsOn"],
    },
    {
        id: "song_liked",
        label: "Someone liked your song",
        whenSent:
            "When a member likes a post in the community. Goes to the person who posted it, once per like, at most 30 a day.",
        keyPrefix: "song_liked",
        fields: ["subject", "preheader", "greeting", "body_1", "body_2", "cta", "untitled", "signoff", "team"],
        variables: ["name", "actor", "song"],
    },
    {
        id: "song_commented",
        label: "Someone commented on your song",
        whenSent:
            "When a member comments on a post in the community. Goes to the person who posted it, with the comment quoted.",
        keyPrefix: "song_commented",
        fields: ["subject", "preheader", "greeting", "body_1", "body_2", "cta", "untitled", "signoff", "team"],
        variables: ["name", "actor", "song"],
    },
];

export function getEmailTemplate(id: string): EmailTemplateDefinition | undefined {
    return EMAIL_TEMPLATES.find((t) => t.id === id);
}

/** Full translation key for one field of one template. */
export function templateKey(template: EmailTemplateDefinition, field: string): string {
    return `email.${template.keyPrefix}.${field}`;
}
