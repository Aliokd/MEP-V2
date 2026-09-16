# Paddle setup

Everything the code needs from the Paddle dashboard, in the order to do it.
The integration is complete in code; nothing here is a code change. Until
these values are in place the paywall says payments are unavailable and lets
people continue without a plan, so a half-configured deploy is safe, but
nobody can start a trial.

Do all of it in the **sandbox** first (sandbox-vendors.paddle.com), run one
signup end to end with a test card, then repeat in the live dashboard and
switch `NEXT_PUBLIC_PADDLE_ENV` to `production`.

## 1. Catalog

Paddle > Catalog > Products.

- One product, "Veinote".
- Four prices on it, one per plan and billing period. On each price:
  - Billing period: monthly or yearly.
  - **Trial period: 3 days.** This must match `TRIAL_DAYS` in
    `lib/paddle/config.ts`; every screen in the flow reads that constant and
    Paddle bills against the trial on the price.
  - Tax: inclusive, so the figure shown is the figure charged in the EU.
  - Currency overrides for SEK and NOK if the USD conversion looks wrong for
    the Nordic launch; Paddle localizes by the visitor's IP.
- Copy each price id (`pri_...`) into the matching variable:

| Plan | Period  | Variable                              |
|------|---------|---------------------------------------|
| Pro  | yearly  | `NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY`  |
| Pro  | monthly | `NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY` |
| Max  | yearly  | `NEXT_PUBLIC_PADDLE_PRICE_MAX_YEARLY`  |
| Max  | monthly | `NEXT_PUBLIC_PADDLE_PRICE_MAX_MONTHLY` |

The dollar figures in `FALLBACK_PRICING` are only what the paywall paints
before Paddle answers; the real price comes from the price preview and the
checkout. Keep them roughly in step so the first paint is not a surprise.

## 2. Client-side token

Paddle > Developer tools > Authentication > Client-side tokens > Generate.

- Value into `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`. Public by design; it is in
  the browser bundle.

## 3. API key

Paddle > Developer tools > Authentication > API keys > Generate.

- Permissions needed: subscriptions (read and write), customers (read),
  customer portal sessions (write), notifications (read).
- Value into `PADDLE_API_KEY`. Server only. Used by the webhook to verify
  signatures, by Settings to open the customer portal, and by the plan change
  route.

## 4. Webhook

Paddle > Developer tools > Notifications > New destination.

- URL: `https://veinote.com/api/paddle/webhook`
- Type: webhook. Version: latest.
- Events, all under `subscription.`: `created`, `activated`, `trialing`,
  `updated`, `past_due`, `paused`, `resumed`, `canceled`.
- Copy the destination's secret key into `PADDLE_WEBHOOK_SECRET`.

The route rejects anything not signed with that secret and acknowledges
unknown events so Paddle stops retrying them. It writes `tier` and `billing`
on `users/{uid}`; the uid comes from `customData.uid`, which the checkout
always sends.

## 5. Checkout settings

Paddle > Checkout > Checkout settings.

- **Default payment link**: `https://veinote.com/onboarding?step=paywall`.
  Paddle refuses to open a checkout until this is set and the domain is
  approved.
- Approved domains: `veinote.com`, plus the preview domain if checkouts are
  to be tested there. Sandbox accepts `localhost`.
- Customer emails (Paddle > Checkout > Emails or Notifications > Customer):
  turn on the **trial ending** reminder. The offer screen promises a
  reminder the day before the first charge, and Paddle sends that one; the
  app does not have its own scheduler for it.

## 6. Where the values go

Production reads its environment from the `.env` the deploy workflow writes,
not from `apphosting.yaml`. Add all eight as GitHub Actions secrets
(Settings > Secrets and variables > Actions, on the Secrets tab), with these
exact names:

```
NEXT_PUBLIC_PADDLE_ENV               production   (anything else means sandbox)
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY
NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY
NEXT_PUBLIC_PADDLE_PRICE_MAX_YEARLY
NEXT_PUBLIC_PADDLE_PRICE_MAX_MONTHLY
PADDLE_API_KEY
PADDLE_WEBHOOK_SECRET
```

The workflow warns when any are missing and when the environment is not
`production`. After a deploy, `GET /api/health/ai` reports a `paddle` check
with the environment and the API key's fingerprint.

For local development put the same names in `.env.local` with sandbox
values.

## 7. One signup, end to end

In sandbox, with `SMTP_PASS` set locally (or read the code from the dev
server's console, where it is logged when mail is off):

1. `/onboarding`, through the quiz, enter a fresh address.
2. The verdict, the offer, the plans. Press "Try for $0.00".
3. Paddle's frame renders under the plan. Test card `4242 4242 4242 4242`,
   any future expiry, any CVC.
4. On completion the success beat plays and the code screen follows. Type
   the code from the email.
5. The welcome. Optionally set a password.
6. Check `users/{uid}` in Firestore: `tier` is `pro` (or `max`),
   `billing.subscriptionStatus` is `trialing`, `billing.trialEndsAt` is three
   days out.
7. Settings > the subscription row says "Free trial, ends ..." and "Manage"
   opens the Paddle portal in a new tab.
8. Profile > "Go Max" changes the subscription in place (no second
   checkout) and the webhook updates `billing.plan`.

## What is deliberately not here

- No app-side trial reminder email. Paddle's own trial-ending email covers
  the promise on the offer screen; enable it in step 5.
- No dunning logic. `past_due` keeps access (see `ENTITLED_STATUSES` in
  `lib/paddle/config.ts`) and Paddle retries the card on its own schedule;
  Settings tells the person to update it.
