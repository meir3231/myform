export default function SendFormLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="skeleton mb-4 h-4 w-48 rounded" />
      <div className="skeleton mb-1 h-8 w-36 rounded-lg" />
      <div className="skeleton mb-6 h-4 w-48 rounded" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="skeleton h-4 w-20 rounded" />
              <div className="skeleton h-10 w-full rounded-lg" />
            </div>
          ))}
          <div className="skeleton h-12 w-full rounded-lg" />
        </div>
        <div className="skeleton h-[400px] w-full rounded-2xl" />
      </div>
    </div>
  );
}
