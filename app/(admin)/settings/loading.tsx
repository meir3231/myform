export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="skeleton mb-6 h-8 w-24 rounded-lg" />
      <div className="card p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-5 w-48 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
