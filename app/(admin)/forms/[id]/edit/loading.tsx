export default function EditFormLoading() {
  return (
    <div className="page-fade-in">
      <div className="skeleton mb-4 h-4 w-48 rounded" />
      <div className="mb-4 flex items-center justify-between">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-10 w-32 rounded-lg" />
      </div>
      <div className="skeleton h-[600px] w-full rounded-2xl" />
    </div>
  );
}
