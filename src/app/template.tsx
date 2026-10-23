// A template (unlike a layout) remounts on every navigation, which lets each page ease in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
