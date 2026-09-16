/**
 * The refund policy, as shipped in code.
 *
 * Same arrangement as /terms and /cookies: /refunds renders this when no
 * `site_pages/refunds` document is published, and the admin's "Import from
 * code" writes it into the CMS as the starting draft. One source, so the
 * fallback and the imported page cannot drift apart.
 *
 * Paddle is the merchant of record for every Veinote subscription, so this
 * describes what Paddle actually does (the trial, the 14-day window, refunds
 * to the original payment method) rather than promising anything the checkout
 * does not deliver. Paddle's seller verification requires this page to exist
 * and be linked from the site; keep it public and keep the footer link.
 *
 * English only, like the other fallbacks. Translations are written in the CMS
 * once the page is imported.
 */
export const REFUNDS_FALLBACK_MD = `
## Who you buy from

Veinote subscriptions are sold by Paddle.com Market Ltd, our merchant of record. Paddle handles the payment, the receipt, any sales tax or VAT, and refunds on our behalf. A Veinote charge appears on your statement as "PADDLE.NET* VEINOTE".

This policy explains when a payment is refunded and how to ask. Nothing in it limits any rights you have under mandatory consumer protection law.

## The free trial

Every Veinote plan starts with a 3-day free trial. We ask for a card when the trial starts so the plan can continue without interruption, but nothing is charged until the trial ends.

You can cancel at any point during the trial from Settings, under Manage subscription. If you cancel before the trial ends, nothing is charged.

## Your first payment

If you are a consumer in the EU, the EEA or the UK, you have a 14-day right of withdrawal. If you ask within 14 days of your first payment, we refund it in full, with no reason needed.

Everyone else can also ask for a refund within 14 days of their first payment. We refund it in full unless the account shows heavy use of the service in that time, in which case we may refund a proportionate amount.

## Renewals

Plans renew automatically at the end of each billing period, monthly or yearly, until cancelled. The renewal date and the amount are shown in Settings under Manage subscription, and Paddle emails a reminder before the first charge of a paid plan.

To avoid a renewal charge, cancel before the renewal date. Your plan stays active until the end of the period you have paid for.

Renewal payments are not refundable once the new period has begun, except where the law requires it. If you missed the renewal and have not used Veinote since it was charged, contact us within 14 days and we will look at it.

## Changing plans

Moving from Pro to Max is charged on a prorated basis for the rest of the current period. Moving down takes effect at the next renewal, and the difference is not refunded for the current period.

## How to ask for a refund

Email support@veinote.com from the address on your Veinote account, and include the receipt number if you have it. You can also contact Paddle directly at paddle.net, which handles the same request.

A refund goes back to the payment method you used. It usually appears within 5 to 10 business days, depending on your bank.

## Cancelling

Cancelling a subscription stops future charges. It does not delete your account or anything you have written; see the Terms & Conditions for how your content is handled.

## Contact

Questions about a charge: support@veinote.com. Technical questions about Veinote: tech@veinote.com.
`;
