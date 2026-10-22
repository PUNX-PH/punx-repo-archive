export default function Loading() {
  return (
    <>
      <h1>Search</h1>
      <div className="stack" aria-busy="true" aria-label="Loading results">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="repo-card skeleton-card">
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: "55%", height: 16 }} />
              <div className="skeleton" style={{ width: "90%", height: 12, marginTop: 10 }} />
              <div className="skeleton" style={{ width: "30%", height: 12, marginTop: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
