"use client";
import Link from "next/link";
import { AuthStatus } from "./AuthStatus";
import { ThemeToggle } from "./ThemeToggle";
export function SiteHeader() {
  return <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
    <Link href="/" className="text-lg font-bold tracking-tight text-ink">Your Renting Helper</Link>
    <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-4"><Link href="/" className="text-sm text-ink-muted hover:text-accent">Search</Link><ThemeToggle /><AuthStatus /></nav>
  </header>;
}
