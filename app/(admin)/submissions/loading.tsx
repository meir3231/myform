export default function SubmissionsLoading() {
  return (
    <div>
      <div className="skeleton mb-6 h-8 w-24 rounded-lg" />
      <div className="card overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead>
            <tr>
              {[...Array(6)].map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="skeleton h-4 w-16 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-line">
            {[...Array(8)].map((_, i) => (
              <tr key={i}>
                <td className="px-4 py-3"><div className="skeleton h-4 w-28 rounded" /></td>
                <td className="px-4 py-3"><div className="skeleton h-4 w-24 rounded" /></td>
                <td className="px-4 py-3"><div className="skeleton h-5 w-16 rounded-full" /></td>
                <td className="px-4 py-3"><div className="skeleton h-4 w-20 rounded" /></td>
                <td className="px-4 py-3"><div className="skeleton h-4 w-20 rounded" /></td>
                <td className="px-4 py-3"><div className="skeleton h-7 w-14 rounded-lg" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
