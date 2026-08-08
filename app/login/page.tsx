"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/app/lib/auth-client";
import { ThemeToggle } from "@/app/components/ThemeToggle";

type Mode = "signIn" | "signUp";

// One page for both sign in and sign up: the two forms share every field
// except name, so a mode toggle beats two near-identical pages.
export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null,
  );
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setVerificationEmail(null);
    setPending(true);

    const result =
      mode === "signIn"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            name,
            email,
            password,
            callbackURL: "/verify-email?verified=1",
          });

    setPending(false);

    if (result.error) {
      if (mode === "signIn" && result.error.status === 403) {
        setPassword("");
        setVerificationEmail(email);
        setNotice(
          "This email still needs verification. Check your inbox or request a new link below.",
        );
        return;
      }

      setError(result.error.message ?? "Something went wrong. Try again.");
      return;
    }

    if (mode === "signUp") {
      setPassword("");
      setVerificationEmail(email);
      setNotice(
        "Check your inbox for a verification link before signing in.",
      );
      return;
    }

    // Full-page navigation, not router.push: client-side nav keeps the old
    // in-memory useSession value (null from before login) alive, which
    // rendered the home page as signed out until a second sign-in. A hard
    // load refetches the session from scratch — same reason the Google
    // redirect flow never had this bug.
    window.location.assign("/");
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) {
      return;
    }

    setError(null);
    setPending(true);

    const result = await authClient.sendVerificationEmail({
      email: verificationEmail,
      callbackURL: "/verify-email?verified=1",
    });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Could not request a new link.");
      return;
    }

    setNotice(
      "If this address belongs to an unverified account, a new link is on its way.",
    );
  };

  // Google is a full-page redirect: the browser leaves for Google's consent
  // screen and comes back through /api/auth/callback/google, so there is no
  // result to handle here — only a failure to start the redirect.
  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setVerificationEmail(null);
    setPending(true);
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });

    if (result.error) {
      setPending(false);
      setError(result.error.message ?? "Could not start Google sign-in.");
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-page px-4 text-ink">
      <ThemeToggle className="absolute right-5 top-5" />
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-bold">
          {mode === "signIn" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Save locations and compare them across visits.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          {mode === "signUp" && (
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                autoComplete="name"
                className="w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              autoComplete="email"
              className="w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password (min. 8 characters)"
              autoComplete={
                mode === "signIn" ? "current-password" : "new-password"
              }
              className="w-full rounded-md border border-line-strong bg-control px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            />
          </div>

          {mode === "signIn" && (
            <p className="text-right text-sm">
              <Link
                href="/forgot-password"
                className="font-semibold text-accent hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger-ink">
              {error}
            </p>
          )}
          {notice && (
            <div
              role="status"
              className="rounded-md border border-line bg-surface-subtle px-3 py-2 text-sm leading-6 text-ink-soft"
            >
              <p>{notice}</p>
              {verificationEmail && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleResendVerification}
                  className="mt-2 font-semibold text-accent hover:underline disabled:text-ink-faint"
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-action py-2 text-sm font-semibold text-action-ink transition hover:bg-action-hover disabled:bg-action-disabled"
          >
            {pending
              ? "Please wait..."
              : mode === "signIn"
                ? "Sign in"
                : "Sign up"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-ink-faint">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={pending}
          className="w-full rounded-md border border-line-strong bg-control py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-raised disabled:text-ink-faint"
        >
          Continue with Google
        </button>

        <p className="mt-5 text-center text-sm text-ink-muted">
          {mode === "signIn" ? "No account yet?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signIn" ? "signUp" : "signIn");
              setError(null);
              setNotice(null);
              setVerificationEmail(null);
            }}
            className="font-semibold text-accent hover:underline"
          >
            {mode === "signIn" ? "Sign up" : "Sign in"}
          </button>
        </p>

        <p className="mt-3 text-center text-sm">
          <Link href="/" className="text-ink-faint hover:underline">
            Back to search
          </Link>
        </p>
      </div>
    </main>
  );
}
