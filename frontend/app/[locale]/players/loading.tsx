export default function PlayersLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="h-8 w-48 bg-surface-card rounded" />

      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 flex-1 bg-surface-card rounded-lg" />
        <div className="h-10 w-32 bg-surface-card rounded-lg" />
        <div className="h-10 w-32 bg-surface-card rounded-lg" />
      </div>

      {/* Player cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-36 bg-surface-card rounded-xl border border-surface-border" />
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-center gap-2">
        <div className="h-10 w-10 bg-surface-card rounded-lg" />
        <div className="h-10 w-10 bg-surface-card rounded-lg" />
        <div className="h-10 w-10 bg-surface-card rounded-lg" />
      </div>
    </div>
  );
}
