import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./email";

describe("auth email delivery", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv(
      "AUTH_EMAIL_FROM",
      "Your Renting Helper <no-reply@auth.example.com>",
    );
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email_1" }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends a verification link in text and HTML", async () => {
    const url = "https://example.com/api/auth/verify-email?token=abc&callbackURL=/";

    await sendVerificationEmail("renter@example.com", url);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Your Renting Helper <no-reply@auth.example.com>",
        to: "renter@example.com",
        subject: "Verify your email for Your Renting Helper",
        text: expect.stringContaining(url),
        html: expect.stringContaining("token=abc&amp;callbackURL=/"),
      }),
    );
  });

  it("sends a password-reset link", async () => {
    const url = "https://example.com/reset-password?token=reset-token";

    await sendPasswordResetEmail("renter@example.com", url);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "renter@example.com",
        subject: "Reset your password for Your Renting Helper",
        text: expect.stringContaining(url),
        html: expect.stringContaining(url),
      }),
    );
  });

  it("fails clearly when server email configuration is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    await expect(
      sendVerificationEmail("renter@example.com", "https://example.com/verify"),
    ).rejects.toThrow("RESEND_API_KEY must be configured");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("turns a provider rejection into a server error", async () => {
    sendMock.mockResolvedValue({
      data: null,
      error: { message: "The sender domain is not verified" },
    });

    await expect(
      sendPasswordResetEmail(
        "renter@example.com",
        "https://example.com/reset-password?token=reset-token",
      ),
    ).rejects.toThrow("Resend could not send the authentication email");
  });
});
