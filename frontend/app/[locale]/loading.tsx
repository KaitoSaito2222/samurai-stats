export default function GlobalLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Hero skeleton */}
      <div className="h-40 bg-surface-card rounded-xl" />

      {/* Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface-card rounded-xl" />
        ))}
      </div>

      {/* List rows */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface-card rounded-lg" />
        ))}
      </div>
    </div>
  );
}
