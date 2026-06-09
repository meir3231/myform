export default function SubmissionDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="skeleton mb-4 h-4 w-48 rounded" />
      <div className="mb-6">
        <div className="skeleton mb-2 h-8 w-48 rounded-lg" />
        <div className="skeleton h-4 w-64 rounded" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="skeleton mb-3 h-5 w-28 rounded" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-4 w-full rounded" />)}
          </div>
        </div>
        <div className="card p-5">
          <div className="skeleton mb-3 h-5 w-28 rounded" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-4 w-full rounded" />)}
          </div>
          <div className="skeleton mt-4 h-10 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
