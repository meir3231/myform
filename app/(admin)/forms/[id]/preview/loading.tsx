export default function PreviewFormLoading() {
  return (
    <div className="page-fade-in">
      <div className="skeleton mb-3 h-4 w-48 rounded" />
      <div className="mx-auto max-w-5xl pb-10">
        <div className="skeleton mb-4 h-12 w-full rounded-xl" />
        <div className="flex flex-col items-center">
          <div className="skeleton h-[40rem] w-full max-w-[640px] rounded" />
        </div>
      </div>
    </div>
  );
}
