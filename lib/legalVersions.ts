/**
 * The version of the Terms & Conditions currently in force.
 *
 * Bump this date whenever a materially changed Terms text is published. Every
 * account records which version it accepted and when (users/{uid}.terms), and
 * the sign-in flow re-records acceptance for accounts whose stored version is
 * older — so a bump here is what makes re-acceptance happen. It must match the
 * effective date shown on /terms.
 */
export const TERMS_VERSION = "2026-08-25";
