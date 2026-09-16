import "server-only";
import { Paddle, Environment } from "@paddle/paddle-node-sdk";
import { PADDLE_ENVIRONMENT } from "./config";

/**
 * The server-side Paddle client, made once per process.
 *
 * Null when PADDLE_API_KEY is unset rather than throwing, so a route can say
 * "billing is not configured" instead of dying at import. The environment
 * follows the same NEXT_PUBLIC_PADDLE_ENV the browser uses: a sandbox key
 * against the production API (or the reverse) is refused by Paddle, so the
 * two cannot silently disagree.
 */
let client: Paddle | null | undefined;

export function getPaddle(): Paddle | null {
    if (client !== undefined) return client;
    const apiKey = process.env.PADDLE_API_KEY;
    client = apiKey
        ? new Paddle(apiKey, {
              environment: PADDLE_ENVIRONMENT === "production" ? Environment.production : Environment.sandbox,
          })
        : null;
    return client;
}

/** The billing fields the routes read off users/{uid}, as the webhook writes them. */
export interface StoredBilling {
    plan: "pro" | "max" | null;
    billingPeriod: "yearly" | "monthly" | null;
    paddleCustomerId: string | null;
    paddleSubscriptionId: string | null;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    nextBilledAt: string | null;
    trialEndsAt: string | null;
    scheduledChange: { action: string; effectiveAt: string } | null;
}
