import Link from "next/link";
import { primaryLinkClass } from "../styles";

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
    <div className="text-center">
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

      <Link href={succeeded ? "/" : "/login"} className={primaryLinkClass}>
        {succeeded ? "Continue to search" : "Back to sign in"}
      </Link>
    </div>
  );
}
