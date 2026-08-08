# Email Verification and Password Reset Plan

Status: Parts 1-3 complete; Part 4 implemented with manual reset-flow check pending
Prepared: 2026-08-08  
Applies to: Better Auth 1.6.23, Next.js 16.2.6 App Router, Prisma 6.19.3, PostgreSQL

## Progress

- [x] Part 1: Resend dependency, server-only email helper, environment wiring, and focused tests.
- [x] Part 2: Better Auth verification/reset callbacks, scheduled with Next.js `after()`.
- [x] Part 3: Sign-up verification and resend interface. Automated checks pass, `auth.viva.monster` is verified in Resend, and the Development inbox/link flow was completed successfully on 2026-08-08.
- [ ] Part 4: Forgot-password and reset-password interfaces. Automated checks pass; real inbox delivery, password replacement, link replay, and session revocation checks are pending.
- [ ] Part 5: Full flow regression checks and current-state documentation.

## Outcome

After this work:

- a new email/password account cannot create a session until its email address is verified;
- the user receives a one-hour verification link after sign-up;
- an unverified existing user receives a fresh verification link when they try to sign in;
- the login page has a **Forgot password?** link;
- password-reset requests always show the same response, whether or not the account exists;
- a valid one-hour reset link lets the user choose a new password;
- resetting a password revokes the user's other sessions;
- Google sign-in continues to work as it does now.

This document now tracks the staged implementation and its remaining manual checks.

## What Already Exists

The project is closer to this feature than it first appears:

- `app/lib/auth.ts` already configures Better Auth email/password and Google authentication.
- `app/api/auth/[...all]/route.ts` already exposes Better Auth's built-in endpoints.
- `prisma/schema.prisma` already has `User.emailVerified` and the `Verification` model Better Auth uses for short-lived tokens.
- `app/login/page.tsx` already owns the sign-up and sign-in forms.
- PostgreSQL and Prisma already persist users, accounts, sessions, and verification records.

Therefore, **no new auth provider and probably no Prisma migration are needed**. Before coding, optionally generate Better Auth's schema to a temporary file and compare it with the auth models in `prisma/schema.prisma`; do not let the generator overwrite the application's full schema.

## Technology Choices

| Concern | Choice | Why this choice |
| --- | --- | --- |
| Authentication | Keep Better Auth 1.6.23 | The project already uses it, and it natively owns verification/reset tokens and endpoints. Replacing it with Clerk or Auth0 would add migration work without solving a current need. |
| Token storage | Existing PostgreSQL `Verification` table | Better Auth creates, expires, validates, and consumes the tokens. The application should not invent its own token model. |
| Email delivery | Resend Node SDK (`resend`) | Small API, good TypeScript support, useful delivery logs, and simple Vercel deployment. |
| Email templates | Small HTML plus plain-text strings in one server-only helper | Two short transactional messages do not justify React Email or a template framework yet. |
| Background sending | Next.js `after()` from `next/server` | Email delivery should continue after the auth response without making account existence easier to infer from response time. Next.js 16 supports `after()` on Vercel and with `next start`/Docker. |
| UI | Existing React/Tailwind patterns | Keeps the experience consistent and avoids a new component library. |
| Tests | Existing Vitest checks plus a focused manual auth-flow matrix | The repository does not currently have browser E2E infrastructure. Adding a whole E2E stack only for this change would be disproportionate; it can be added later with the broader auth test roadmap. |

### Deliberately not chosen

- **Email OTP codes:** link verification is simpler for this first version and is already built into Better Auth.
- **React Email:** attractive, but unnecessary for two small emails.
- **A custom reset-token table or API routes:** Better Auth already implements them more safely.
- **A database-backed rate-limit table:** Better Auth's built-in production limiter and focused per-endpoint rules are enough for this personal project's first release. In-memory limits are per server instance, so database/Redis-backed limits should be reconsidered if abuse or email cost becomes real.

## Mental Model to Learn First

There are three separate systems working together:

1. **Better Auth proves intent.** It creates a random, expiring, single-use token and stores its protected representation in `Verification`.
2. **Resend transports the link.** It sends the URL to the inbox, but it does not decide whether the token is valid.
3. **The app explains state.** React pages show “check your email,” expired-link, reset form, and success states without exposing whether an account exists.

Never create tokens with `Math.random()`, store raw reset tokens in `User`, or write custom password hashing. Better Auth already handles those security-sensitive parts.

## Planned User Flows

### New email/password sign-up

1. The user submits name, email, and password on `/login`.
2. `authClient.signUp.email` includes `callbackURL: "/verify-email"`.
3. Better Auth creates the user with `emailVerified = false`, creates a verification record, and asks the configured callback to send the email.
4. The UI does **not** navigate home or claim that a session exists. It shows a generic check-inbox state and a resend action.
5. The email link calls Better Auth's existing verification endpoint.
6. Better Auth validates and consumes the token, marks the email verified, signs the user in, and redirects to `/verify-email`.
7. `/verify-email` shows success and a **Continue to search** link. An invalid/expired link shows a safe error and a link back to `/login` to request another email.

Recommended choice: `autoSignInAfterVerification: true`. Clicking the inbox link already proves control of the address, and automatic sign-in removes an unnecessary second password entry.

### Existing unverified email/password user

This matters because accounts created before this feature currently have `emailVerified = false`.

1. Do not bulk-update those rows to `true`; that would claim verification never performed.
2. Their next sign-in is rejected with HTTP 403.
3. With `sendOnSignIn: true`, Better Auth sends a fresh verification email.
4. The login UI changes the raw error into “Please verify your email. We sent a new link.” and offers a resend button.
5. Currently valid sessions may continue until they end; new email/password sessions require verification.

### Forgot password

1. `/login` shows **Forgot password?** only in sign-in mode.
2. `/forgot-password` asks only for an email address.
3. It calls `authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })`.
4. It always shows: “If an account exists for that email, we sent a reset link.”
5. It never says “email not found” and does not change wording based on the API result.

### Reset password

1. Better Auth redirects a valid link to `/reset-password?token=...`; an invalid or expired link includes an error.
2. A small Server Component reads Next.js 16's asynchronous `searchParams` and passes only the token/error state to a client form.
3. The form asks for new password and confirmation, checks 8–128 characters and equality, then calls `authClient.resetPassword({ newPassword, token })`.
4. On success it clears the form and shows a link to `/login`.
5. Better Auth consumes the token and revokes other sessions. The old password and a replayed link must no longer work.

## Exact Better Auth Configuration

Extend the existing `betterAuth({ ... })` call in `app/lib/auth.ts`; do not create a second auth instance.

```ts
emailVerification: {
  sendVerificationEmail: /* queue Resend email with after() */,
  sendOnSignUp: true,
  sendOnSignIn: true,
  autoSignInAfterVerification: true,
  expiresIn: 60 * 60,
},
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
  sendResetPassword: /* queue Resend email with after() */,
  resetPasswordTokenExpiresIn: 60 * 60,
  revokeSessionsOnPasswordReset: true,
},
rateLimit: {
  customRules: {
    "/send-verification-email": { window: 15 * 60, max: 3 },
    "/request-password-reset": { window: 15 * 60, max: 3 },
  },
},
```

Keep Better Auth's built-in password hashing, CSRF/origin checks, token generation, and default sign-in rate limits. Do not log the `url` or `token` values.

## File-by-File Implementation Plan

### 1. Provider and environment setup

Before deploying code:

1. Create a Resend account.
2. For initial development, use Resend's test sender and send only to the Resend account owner's inbox.
3. Before public testing, verify a domain or subdomain you control, preferably `auth.<your-domain>`, and use a sender such as `Your Renting Helper <no-reply@auth.<your-domain>>`.
4. Add the DNS records Resend requests (SPF/DKIM), then add DMARC when the sending domain is stable.
5. Create separate development and production API keys.
6. Set these server-only variables in each Vercel environment:

```env
RESEND_API_KEY=re_...
AUTH_EMAIL_FROM=Your Renting Helper <no-reply@auth.example.com>
```

`BETTER_AUTH_URL` remains the canonical origin used to construct auth links. Check that it is `http://localhost:3000` locally and the real HTTPS origin in production. Never prefix either new variable with `NEXT_PUBLIC_`.

Current project setup: Resend verified `auth.viva.monster` on 2026-08-08, and local Development uses `Your Renting Helper <no-reply@auth.viva.monster>`. A real Outlook verification email was received, its link verified the account, and the resulting session reached the search page. The same sender still needs to be confirmed in all Vercel environment scopes before the next deployment.

### 2. `package.json` and lockfile

- Install the `resend` package with the repository's existing npm workflow.
- Do not add React Email or another template dependency.

Learning checkpoint: inspect the package diff and identify the difference between a runtime dependency and a development dependency.

### 3. New `app/lib/email.ts`

Create one server-only module that:

- creates the Resend client from `RESEND_API_KEY`;
- reads and validates `AUTH_EMAIL_FROM`;
- exports two small functions: `sendVerificationEmail(to, url)` and `sendPasswordResetEmail(to, url)`;
- sends both HTML and plain-text bodies;
- checks Resend's returned `error` value and throws a sanitized error;
- never logs recipients, links, or tokens in normal logs.

Keep branding minimal: app name, one sentence, one action button/link, one-hour expiry, and “ignore this email if you did not request it.”

Learning checkpoint: explain why this module is server-only and why an API key must never enter the browser bundle.

### 4. Update `app/lib/auth.ts`

- Add the exact Better Auth configuration above.
- In each send callback, call `after(async () => { ... })` and catch/log only a safe provider error message.
- Preserve the current Prisma adapter, OAuth token encryption, and Google provider configuration.
- Optionally generate Better Auth's schema to `prisma/better-auth.generated.prisma`, review only the auth models, then remove that temporary file. The expected result is no Prisma schema change because the required fields already exist. Use the CLI release matching Better Auth 1.6; confirm the version before running the documented command below if `latest` has moved on:

```bash
npx auth@latest generate --config ./app/lib/auth.ts --output ./prisma/better-auth.generated.prisma
```

Learning checkpoint: follow one request from the client method, through `/api/auth/[...all]`, into Better Auth, PostgreSQL, and the email callback.

### 5. Update `app/login/page.tsx`

- Keep the current combined sign-in/sign-up page.
- Add a success/status state separate from the error state.
- Pass `callbackURL: "/verify-email"` on email sign-up.
- After successful sign-up, show the generic check-inbox state instead of `window.location.assign("/")`.
- Detect the unverified-email 403 response on sign-in and show friendly copy.
- Add a resend button that calls `authClient.sendVerificationEmail({ email, callbackURL: "/verify-email" })` and uses generic success copy.
- Add **Forgot password?** under the password field only in sign-in mode.
- Disable submit/resend buttons while pending and expose status text with `aria-live`.
- Leave Google sign-in unchanged.

Learning checkpoint: compare authentication state (session) with UI state (`pending`, `error`, and “check inbox”). They are related but not the same thing.

### 6. Add `app/verify-email/page.tsx`

- Use a small Server Component.
- Read Next.js 16 `searchParams` asynchronously.
- Show success when there is no verification error.
- Show expired/invalid-link guidance when `error` is present.
- Do not echo raw query values or tokens.

### 7. Add `app/forgot-password/page.tsx`

- Use a small Client Component with email, pending, error, and submitted states.
- Call `authClient.requestPasswordReset` with `redirectTo: "/reset-password"`.
- Always use the same submitted message for known and unknown addresses.
- Include links back to sign in and home.

Learning checkpoint: explain email enumeration and why “we could not find that account” is unsafe on a public reset form.

### 8. Add the reset-password page

Use two small files so the Next.js boundary remains clear:

- `app/reset-password/page.tsx`: Server Component that awaits `searchParams` and passes `token`/invalid state.
- `app/reset-password/ResetPasswordForm.tsx`: Client Component that owns form state and calls `authClient.resetPassword`.

The form must include:

- new password and confirm password fields;
- `minLength={8}`, `maxLength={128}`, and `autoComplete="new-password"`;
- client-side equality checking;
- invalid/expired-token, pending, API-error, and success states;
- no token logging and no token displayed in the page.

Learning checkpoint: explain why the Server Component reads the URL while the Client Component owns interactive form state.

### 9. Configuration and project documentation

Update:

- `.env.docker.example` with `RESEND_API_KEY` and `AUTH_EMAIL_FROM`;
- `docker-compose.yml` to pass both server-only variables to the app container;
- `dev_notes.md` environment table, authentication behaviour, testing notes, and feature status;
- `README.md` only if setup instructions need a new user-visible prerequisite.

No secret values belong in Git.

## Verification Checklist

Run the normal quality gates:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Then manually test against the development database and Resend logs:

| Case | Expected result |
| --- | --- |
| New email sign-up | No session before verification; generic check-inbox message; one email sent. |
| Verification link | `emailVerified` becomes true; user is signed in; link redirects safely. |
| Reused or expired verification link | No session created; friendly invalid-link state. |
| Resend verification | A new link is sent; repeated clicks are rate-limited. |
| Existing pre-feature email user | Sign-in is blocked; a verification email is sent; account data remains intact. |
| Verified email sign-in | Existing login flow and home redirect still work. |
| Unknown reset email | Same browser message as a known email; no account information leaks. |
| Known reset email | One reset message arrives with the correct origin and one-hour expiry. |
| Valid reset link | New password works; old password fails. |
| Reset-link replay/expiry | Reset is rejected with a safe error. |
| Existing sessions after reset | Other sessions are invalidated. |
| Google sign-in | Still succeeds and does not enter the email/password verification loop. |
| Missing/invalid Resend configuration | Development exposes a useful server log; browser receives no secret/provider detail. |
| Local and production links | Each email points to the correct `BETTER_AUTH_URL`, never a preview or localhost origin by mistake. |

Inspect `User.emailVerified` and `Verification` with Prisma Studio while learning, but do not manually edit tokens or mark users verified during the real test.

## Deployment Order and Rollback

1. Verify the Resend domain and add environment variables first.
2. Test all flows against the development database and development origin.
3. Deploy to a controlled preview only if its `BETTER_AUTH_URL` is correct; otherwise test the linked development deployment.
4. Apply a Prisma migration only if schema review found a real difference. None is expected.
5. Deploy the code to production.
6. Test one new account and one existing unverified account immediately.
7. Watch Vercel function logs and Resend delivery logs, without logging auth URLs or tokens.

Rollback is code-only if no schema change was needed: revert the auth/UI change while leaving the new environment variables in place. Existing users and verification records remain harmless. If email delivery fails after enforcement is live, roll back `requireEmailVerification` with the rest of the feature rather than marking users verified manually.

## Definition of Done

The feature is done only when:

- all new email/password sessions require verified email ownership;
- existing unverified users have a clear recovery path;
- reset requests do not reveal account existence;
- verification and reset links expire and cannot be reused;
- password reset revokes other sessions;
- Resend is configured for both development and production;
- Google OAuth and existing user data still work;
- the quality gates and every relevant manual case above pass;
- the current-state sections of `dev_notes.md` are updated after implementation.

## Primary References

- [Better Auth 1.6 email and password](https://better-auth.com/docs/authentication/email-password)
- [Better Auth email concepts](https://better-auth.com/docs/concepts/email)
- [Better Auth rate limiting](https://better-auth.com/docs/concepts/rate-limit)
- [Next.js 16 `after()`](https://nextjs.org/docs/app/api-reference/functions/after)
- [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email)
- [Resend sender/domain setup](https://resend.com/docs/knowledge-base/how-do-I-create-an-email-address-or-sender-in-resend)
- [Resend test addresses](https://resend.com/docs/dashboard/emails/send-test-emails)
