export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading repository">
      <div className="repo-hero">
        <div className="skeleton" style={{ width: 64, height: 64, borderRadius: 16 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: "60%", height: 22 }} />
          <div className="skeleton" style={{ width: "85%", height: 14, marginTop: 10 }} />
        </div>
      </div>
      <div className="stats">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />)}
      </div>
      <div className="skeleton" style={{ width: "100%", height: 260, marginTop: 24 }} />
    </div>
  );
}
