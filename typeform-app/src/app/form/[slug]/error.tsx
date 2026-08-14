"use client";

export default function FormError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif",
      gap: "16px", padding: "20px", textAlign: "center",
    }}>
      <h2 style={{ fontSize: "20px", fontWeight: 600 }}>Something went wrong</h2>
      <p style={{ color: "#666", maxWidth: "400px" }}>{error.message}</p>
      <button
        onClick={reset}
        style={{
          padding: "10px 24px", borderRadius: "8px", border: "none",
          background: "#191919", color: "#fff", cursor: "pointer", fontSize: "14px",
        }}
      >
        Try again
      </button>
    </div>
  );
}
