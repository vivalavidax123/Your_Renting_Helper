import { ResetPasswordForm } from "./ResetPasswordForm";

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

  return <ResetPasswordForm token={token} invalid={invalid} />;
}
