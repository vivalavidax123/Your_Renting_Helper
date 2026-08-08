import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { after } from "next/server";
import { prisma } from "@/app/lib/db";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/app/lib/email";

function queueAuthEmail(deliver: () => Promise<void>) {
  after(async () => {
    try {
      await deliver();
    } catch (error) {
      console.error(
        "Authentication email delivery failed.",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  });
}

// Server-side auth instance. Owns password hashing, session cookies, and the
// Google OAuth exchange; all state lives in our own Postgres via Prisma.
// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Encrypt Google OAuth token material before it is stored in Postgres.
  // Better Auth still reads existing plaintext tokens and encrypts them the
  // next time the provider account is created, refreshed, or signed in.
  account: { encryptOAuthTokens: true },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    async sendVerificationEmail({ user, url }) {
      queueAuthEmail(() => sendVerificationEmail(user.email, url));
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      queueAuthEmail(() => sendPasswordResetEmail(user.email, url));
    },
  },
  rateLimit: {
    customRules: {
      "/send-verification-email": { window: 15 * 60, max: 3 },
      "/request-password-reset": { window: 15 * 60, max: 3 },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
});
