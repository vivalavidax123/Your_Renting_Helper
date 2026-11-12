"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">This page could not be loaded</h1>
      <button onClick={reset} className="mt-4 underline">
        Try again
      </button>
    </main>
  );
}
