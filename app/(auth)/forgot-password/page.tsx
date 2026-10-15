"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/app/lib/authClient";
import { inputClass, primaryButtonClass } from "../styles";

const submittedMessage =
  "If an account exists for that email, we sent a password-reset link.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setPending(false);

    if (result.error) {
      setError("Could not request a reset link. Please try again later.");
      return;
    }

    setSubmitted(true);
  };

  return (
    <>
      <h1 className="text-xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm leading-6 text-ink-muted">
        Enter the email address used for your account.
      </p>

      {submitted ? (
        <div
          role="status"
          className="mt-5 rounded-md border border-line bg-surface-subtle px-3 py-3 text-sm leading-6 text-ink-soft"
        >
          {submittedMessage}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="reset-email" className="sr-only">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              autoComplete="email"
              disabled={pending}
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-danger-ink">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className={primaryButtonClass}
          >
            {pending ? "Requesting link..." : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-sm">
        <Link
          href="/login"
          className="font-semibold text-accent hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
