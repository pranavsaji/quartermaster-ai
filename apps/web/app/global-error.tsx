"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors in the root layout. It replaces the whole
 * document, so it carries its own minimal inline styles instead of globals.css.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f6f7f9", color: "#101828" }}>
        <title>Something went wrong · Quartermaster</title>
        <main style={{ maxWidth: 480, margin: "96px auto", padding: "0 16px" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Quartermaster couldn&apos;t load</h1>
          <p style={{ fontSize: 14, color: "#475467", lineHeight: 1.5 }}>
            Something went wrong while starting the console. Your data is safe. Try again, and if it keeps happening share
            the reference below with your administrator.
          </p>
          {error.digest ? (
            <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#475467" }}>reference {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={retry}
            style={{
              marginTop: 8,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid transparent",
              background: "#2453d8",
              color: "#fff",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
