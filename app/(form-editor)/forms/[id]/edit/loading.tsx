export default function EditFormLoading() {
  return (
    <div className="page-fade-in grid h-full gap-6" style={{ gridTemplateColumns: "170px minmax(400px,1fr) minmax(260px,292px)" }}>
      <div className="skeleton h-full w-full rounded-2xl" />
      <div className="skeleton h-full w-full rounded-2xl" />
      <div className="skeleton h-full w-full rounded-2xl" />
    </div>
  );
}
