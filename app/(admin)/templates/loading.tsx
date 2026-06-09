export default function TemplatesLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="skeleton h-8 w-24 rounded-lg" />
        <div className="skeleton h-12 w-36 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card flex flex-col p-5">
            <div className="mb-3 flex items-start gap-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-5 w-36 rounded" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
            </div>
            <div className="mt-auto flex gap-2 pt-3">
              <div className="skeleton h-8 w-24 rounded-lg" />
              <div className="skeleton h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
