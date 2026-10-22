export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading repository">
      <div className="repo-head">
        <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 12 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: "60%", height: 20 }} />
          <div className="skeleton" style={{ width: "85%", height: 14, marginTop: 10 }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: "100%", height: 220, marginTop: 24 }} />
    </div>
  );
}
