"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/app/lib/auth-client";

type ResetPasswordFormProps = {
  token: string | null;
  invalid: boolean;
};

export function ResetPasswordForm({
  token,
  invalid,
}: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  if (invalid || !token) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold">Reset link unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          This password-reset link is invalid or has expired. Request a new
          link to continue.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-flex w-full justify-center rounded-md bg-action py-2 text-sm font-semibold text-action-ink transition hover:bg-action-hover"
        >
          Request another link
        </Link>
      </div>
    );
  }

  if (succeeded) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold">Password updated</h1>
        <p role="status" className="mt-3 text-sm leading-6 text-ink-muted">
          Your old password and existing sessions are no longer valid. Sign in
          with your new password.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-flex w-full justify-center rounded-md bg-action py-2 text-sm font-semibold text-action-ink transition hover:bg-action-hover"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8 || newPassword.length > 128) {
      setError("Password must be between 8 and 128 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const result = await authClient.resetPassword({ newPassword, token });
    setPending(false);

    if (result.error) {
      setError("This reset link is invalid or has expired. Request a new one.");
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    window.history.replaceState(null, "", "/reset-password");
    setSucceeded(true);
  };

  return (
    <>
      <h1 className="text-xl font-bold">Choose a new password</h1>
      <p className="mt-1 text-sm leading-6 text-ink-muted">
        Use between 8 and 128 characters.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <div>
          <label htmlFor="new-password" className="sr-only">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            disabled={pending}
            className="w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent disabled:text-ink-faint"
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="sr-only">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            disabled={pending}
            className="w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent disabled:text-ink-faint"
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
          className="w-full rounded-md bg-action py-2 text-sm font-semibold text-action-ink transition hover:bg-action-hover disabled:bg-action-disabled"
        >
          {pending ? "Updating password..." : "Update password"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="text-ink-faint hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
