"use client"; // Error boundaries must be Client Components

// Replaces the root layout when it fails, so the app's stylesheet and theme
// tokens may not be available: inline styles and system colours only.
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          colorScheme: "light dark",
          background: "Canvas",
          color: "CanvasText",
          fontFamily: "system-ui, Arial, sans-serif",
          textAlign: "center",
        }}
      >
        <title>Something went wrong · Your Renting Helper</title>
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            Your Renting Helper hit an unexpected problem. Your saved locations
            are not affected.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 8,
              minHeight: 44,
              padding: "0 20px",
              border: 0,
              borderRadius: 6,
              background: "#059669",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
