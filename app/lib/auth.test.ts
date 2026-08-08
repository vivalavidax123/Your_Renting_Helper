import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  afterMock,
  betterAuthMock,
  sendPasswordResetEmailMock,
  sendVerificationEmailMock,
} = vi.hoisted(() => ({
  afterMock: vi.fn(),
  betterAuthMock: vi.fn((options: unknown) => ({ options })),
  sendPasswordResetEmailMock: vi.fn(),
  sendVerificationEmailMock: vi.fn(),
}));

vi.mock("next/server", () => ({ after: afterMock }));
vi.mock("better-auth", () => ({ betterAuth: betterAuthMock }));
vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: vi.fn(() => ({})),
}));
vi.mock("@/app/lib/db", () => ({ prisma: {} }));
vi.mock("@/app/lib/email", () => ({
  sendPasswordResetEmail: sendPasswordResetEmailMock,
  sendVerificationEmail: sendVerificationEmailMock,
}));

import "./auth";

type EmailCallback = (
  data: {
    user: { email: string };
    url: string;
    token: string;
  },
  request?: Request,
) => Promise<void>;

type AuthOptionsUnderTest = {
  emailVerification: {
    sendVerificationEmail: EmailCallback;
    sendOnSignUp: boolean;
    sendOnSignIn: boolean;
    autoSignInAfterVerification: boolean;
    expiresIn: number;
  };
  emailAndPassword: {
    sendResetPassword: EmailCallback;
    requireEmailVerification: boolean;
    resetPasswordTokenExpiresIn: number;
    revokeSessionsOnPasswordReset: boolean;
  };
  rateLimit: {
    customRules: Record<string, { window: number; max: number }>;
  };
};

const options = betterAuthMock.mock.calls[0][0] as AuthOptionsUnderTest;

function scheduledEmailTask() {
  return afterMock.mock.calls[0][0] as () => Promise<void>;
}

describe("Better Auth email callbacks", () => {
  beforeEach(() => {
    afterMock.mockReset();
    sendPasswordResetEmailMock.mockReset();
    sendVerificationEmailMock.mockReset();
  });

  it("requires one-hour email verification for password accounts", () => {
    expect(options.emailVerification).toMatchObject({
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
    });
    expect(options.emailAndPassword.requireEmailVerification).toBe(true);
    expect(options.emailAndPassword.resetPasswordTokenExpiresIn).toBe(60 * 60);
    expect(options.emailAndPassword.revokeSessionsOnPasswordReset).toBe(true);
    expect(
      options.rateLimit.customRules["/send-verification-email"],
    ).toEqual({ window: 15 * 60, max: 3 });
    expect(
      options.rateLimit.customRules["/request-password-reset"],
    ).toEqual({ window: 15 * 60, max: 3 });
  });

  it("queues the verification email after the auth response", async () => {
    sendVerificationEmailMock.mockResolvedValue(undefined);

    await options.emailVerification.sendVerificationEmail({
      user: { email: "renter@example.com" },
      url: "https://example.com/verify?token=verification-token",
      token: "verification-token",
    });

    expect(afterMock).toHaveBeenCalledOnce();
    expect(sendVerificationEmailMock).not.toHaveBeenCalled();

    await scheduledEmailTask()();

    expect(sendVerificationEmailMock).toHaveBeenCalledWith(
      "renter@example.com",
      "https://example.com/verify?token=verification-token",
    );
  });

  it("queues the password-reset email after the auth response", async () => {
    sendPasswordResetEmailMock.mockResolvedValue(undefined);

    await options.emailAndPassword.sendResetPassword({
      user: { email: "renter@example.com" },
      url: "https://example.com/reset-password?token=reset-token",
      token: "reset-token",
    });

    expect(afterMock).toHaveBeenCalledOnce();
    expect(sendPasswordResetEmailMock).not.toHaveBeenCalled();

    await scheduledEmailTask()();

    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith(
      "renter@example.com",
      "https://example.com/reset-password?token=reset-token",
    );
  });

  it("logs a safe error without failing the auth response", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    sendVerificationEmailMock.mockRejectedValue(
      new Error("Resend could not send the authentication email"),
    );

    await options.emailVerification.sendVerificationEmail({
      user: { email: "renter@example.com" },
      url: "https://example.com/verify?token=verification-token",
      token: "verification-token",
    });
    await expect(scheduledEmailTask()()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      "Authentication email delivery failed.",
      "Resend could not send the authentication email",
    );
    consoleError.mockRestore();
  });
});
