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
            "greeting",
            "body_1",
            "body_2",
            "features_title",
            "features",
            "cta",
            "waitlist_note",
            "ignore",
            "signoff",
            "team",
        ],
        listFields: ["features"],
        variables: ["inviter", "project", "days"],
    },
];

export function getEmailTemplate(id: string): EmailTemplateDefinition | undefined {
    return EMAIL_TEMPLATES.find((t) => t.id === id);
}

/** Full translation key for one field of one template. */
export function templateKey(template: EmailTemplateDefinition, field: string): string {
    return `email.${template.keyPrefix}.${field}`;
}
