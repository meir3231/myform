export default function TemplatesLoading() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <div className="skeleton h-8 w-24 rounded-lg" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="skeleton h-12 w-[200px] rounded-xl" />
      </div>
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
        <aside className="flex w-[520px] shrink-0 flex-col gap-3 overflow-hidden">
          <div className="flex h-11 items-center gap-2">
            <div className="skeleton h-11 w-44 rounded-[10px]" />
            <div className="skeleton h-11 flex-1 rounded-[10px]" />
            <div className="skeleton h-11 w-11 rounded-xl" />
          </div>
          <div className="card flex-1 space-y-0 overflow-hidden p-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex h-16 items-center gap-3 border-b border-paper-line px-3 last:border-0">
                <div className="skeleton h-7 w-7 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton h-4 w-3/4 rounded" />
                  <div className="skeleton h-3 w-1/3 rounded" />
                </div>
                <div className="skeleton h-4 w-16 shrink-0 rounded" />
                <div className="skeleton h-7 w-24 shrink-0 rounded-full" />
                <div className="skeleton h-7 w-7 shrink-0 rounded" />
              </div>
            ))}
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex h-full flex-col">
            <div className="mb-3 flex h-10 shrink-0 items-center gap-3">
              <div className="skeleton h-10 w-32 rounded-xl" />
              <div className="skeleton h-10 w-32 rounded-xl" />
              <div className="skeleton mr-auto h-10 w-32 rounded-xl" />
            </div>
            <div className="skeleton card min-h-0 flex-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
