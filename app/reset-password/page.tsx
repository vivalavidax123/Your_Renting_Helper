import { ThemeToggle } from "@/app/components/ThemeToggle";
import { ResetPasswordForm } from "@/app/reset-password/ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token: tokenValue, error } = await searchParams;
  const token = typeof tokenValue === "string" ? tokenValue : null;
  const invalid = Boolean(error) || !token;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-page px-4 text-ink">
      <ThemeToggle className="absolute right-5 top-5" />
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-sm">
        <ResetPasswordForm token={token} invalid={invalid} />
      </div>
    </main>
  );
}
