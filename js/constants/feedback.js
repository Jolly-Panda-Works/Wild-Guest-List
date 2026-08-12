/* ══════════════════════════════════════════════════════════
   Feedback form config
   ══════════════════════════════════════════════════════════
   FEEDBACK_EMAIL is the address feedback submissions are sent
   to, via FormSubmit (https://formsubmit.co) — a free service
   that lets a static, backend-less site send form submissions
   straight to an inbox.

   ⚠️ REPLACE THE PLACEHOLDER BELOW WITH YOUR REAL ADDRESS ⚠️
   The first submission after you deploy will NOT arrive
   directly — FormSubmit sends a one-time confirmation email to
   this address first, and you must click the link inside it to
   activate the endpoint. Every submission after that goes
   straight through automatically, silently (no page reload,
   no visible redirect to formsubmit.co).
   ══════════════════════════════════════════════════════════ */

export const FEEDBACK_EMAIL = "feedback@useffarahmand.com"; // TODO: put your real email here

export const FEEDBACK_ENDPOINT = `https://formsubmit.co/ajax/${FEEDBACK_EMAIL}`;
