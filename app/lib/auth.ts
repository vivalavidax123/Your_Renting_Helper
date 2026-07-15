import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/app/lib/db";

// Server-side auth instance. Owns password hashing, session cookies, and the
// Google OAuth exchange; all state lives in our own Postgres via Prisma.
// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Encrypt Google OAuth token material before it is stored in Postgres.
  // Better Auth still reads existing plaintext tokens and encrypts them the
  // next time the provider account is created, refreshed, or signed in.
  account: { encryptOAuthTokens: true },
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
});
