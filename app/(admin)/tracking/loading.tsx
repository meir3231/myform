export default function TrackingLoading() {
  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* כותרת ושורת פעולות */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="skeleton h-8 w-32 rounded-lg" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="flex items-center gap-4">
          <div className="skeleton h-12 w-44 rounded-xl" />
          <div className="skeleton h-12 w-44 rounded-xl" />
        </div>
      </div>

      {/* KPI */}
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card flex items-center gap-3 p-3">
            <div className="skeleton h-11 w-11 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-7 w-12 rounded" />
              <div className="skeleton h-4 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* סרגל פילטרים */}
      <div className="card flex shrink-0 flex-wrap items-center gap-3 p-4">
        <div className="skeleton h-11 w-[330px] rounded-xl" />
        <div className="skeleton h-11 w-[190px] rounded-xl" />
        <div className="skeleton h-11 w-[190px] rounded-xl" />
        <div className="skeleton h-11 w-[190px] rounded-xl" />
      </div>

      {/* תוכן ראשי */}
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <div className="card hidden w-[300px] shrink-0 flex-col gap-3 p-3 xl:flex">
          <div className="skeleton h-5 w-28 rounded" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="skeleton h-7 w-7 shrink-0 rounded-full" />
              <div className="skeleton h-3 flex-1 rounded" />
            </div>
          ))}
        </div>

        <div className="card flex min-w-0 flex-1 flex-col overflow-hidden">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-soft-border">
                {[...Array(8)].map((_, i) => (
                  <th key={i} className="px-3 py-3">
                    <div className="skeleton h-4 w-16 rounded" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-soft-border">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="skeleton h-4 w-full rounded" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
