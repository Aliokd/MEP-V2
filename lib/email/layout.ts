import "server-only";

export interface RenderLayoutOptions {
    preheader: string;
    bodyHtml: string;
}

const ACCENT = "#86BE7F";
const INK = "#363636";
const BG = "#F3F3EF";
const CARD = "#FFFFFF";
const BORDER = "#E7E5DE";
const MUTED = "#78716C";

// Table-based layout for email-client compatibility. Inline styles only — no external CSS.
export function renderLayout({ preheader, bodyHtml }: RenderLayoutOptions): string {
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Veinote</title>
</head>
<body style="margin:0; padding:0; background-color:${BG}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<span style="display:none; font-size:1px; color:${BG}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td align="center" style="padding-bottom:32px;">
            <span style="font-size:20px; font-weight:600; letter-spacing:0.02em; color:${INK};">Veinote</span>
          </td>
        </tr>
        <tr>
          <td style="background-color:${CARD}; border:1px solid ${BORDER}; border-radius:20px; padding:40px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:32px;">
            <p style="margin:0; font-size:12px; color:${MUTED}; line-height:1.6;">
              You're receiving this email because of activity on your Veinote account.<br />
              Need help? Reply to this email or reach us at <a href="mailto:support@veinote.com" style="color:${MUTED};">support@veinote.com</a>.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function emailButton(label: string, url: string): string {
    return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:14px; background-color:${ACCENT};">
  <a href="${url}" style="display:inline-block; padding:14px 28px; font-size:15px; font-weight:600; color:${INK}; text-decoration:none; border-radius:14px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export const emailColors = { ACCENT, INK, BG, CARD, BORDER, MUTED };
