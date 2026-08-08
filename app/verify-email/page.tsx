import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    verified?: string | string[];
    error?: string | string[];
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { verified, error } = await searchParams;
  const failed = Boolean(error);
  const succeeded = verified === "1" && !failed;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-page px-4 text-ink">
      <ThemeToggle className="absolute right-5 top-5" />
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold">
          {failed
            ? "Verification link unavailable"
            : succeeded
              ? "Email verified"
              : "Check your email"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          {failed
            ? "This verification link is invalid or has expired. Sign in to request a new one."
            : succeeded
              ? "Your email address is confirmed and you are signed in."
              : "Open the verification link we sent you to finish creating your account."}
        </p>

        <Link
          href={succeeded ? "/" : "/login"}
          className="mt-5 inline-flex w-full justify-center rounded-md bg-action py-2 text-sm font-semibold text-action-ink transition hover:bg-action-hover"
        >
          {succeeded ? "Continue to search" : "Back to sign in"}
        </Link>
      </div>
    </main>
  );
}
