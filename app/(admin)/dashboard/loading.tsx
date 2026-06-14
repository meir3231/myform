export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="skeleton h-8 w-36 rounded-lg" />
        <div className="skeleton h-9 w-28 rounded-lg" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-paper-line bg-white p-4" style={{ borderTop: "3px solid #EEF2F7" }}>
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <div className="skeleton h-7 w-16 rounded" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="skeleton mb-4 h-5 w-32 rounded" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-4 w-full rounded" />)}
          </div>
        </div>
        <div className="card p-5">
          <div className="skeleton mb-4 h-5 w-32 rounded" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-4 w-full rounded" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
