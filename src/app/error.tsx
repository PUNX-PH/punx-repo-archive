"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="notice error-box" role="alert">
      <strong>Something went wrong.</strong>
      <span>This is usually temporary, often GitHub rate limiting us. Try again in a moment.</span>
      <div className="actions">
        <button className="btn primary" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
