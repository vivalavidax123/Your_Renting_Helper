import Link from "next/link";
import { ThemeToggle } from "@/app/components/ThemeToggle";

// Shared frame for the account pages (sign in, password reset, email
// verification): a centred card with the theme toggle and a way home.
// The (auth) folder is a route group, so it does not appear in the URL.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-5 bg-page px-4 py-10 text-ink">
      <ThemeToggle className="absolute right-5 top-5" />
      <Link href="/" className="text-lg font-bold tracking-tight text-ink">
        Your Renting Helper
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
