// Generic placeholder page for Tools-drawer routes not yet migrated.
// Keeps nav working; each route will be replaced with a real surface in later phases.
export default function Placeholder({ name }: { name: string }) {
  return (
    <div className="page">
      <h1 className="page-title">{name}</h1>
      <div className="card dim" style={{ padding: 20, marginTop: 16 }}>
        Surface pending migration. The decision-first shell and Brief hero are live; this route is scaffolded.
      </div>
    </div>
  );
}
