export default function PlayerDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Player header skeleton */}
      <div className="flex items-center gap-6 bg-surface-card rounded-xl border border-surface-border p-6">
        <div className="w-24 h-24 rounded-full bg-surface-border flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-48 bg-surface-border rounded" />
          <div className="h-4 w-32 bg-surface-border rounded" />
          <div className="h-4 w-24 bg-surface-border rounded" />
        </div>
      </div>

      {/* Stats table skeleton */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-6 space-y-4">
        <div className="h-6 w-32 bg-surface-border rounded" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-border rounded" />
          ))}
        </div>
      </div>

      {/* AI summary skeleton */}
      <div className="bg-surface-card rounded-xl border border-surface-border p-6 space-y-4">
        <div className="h-6 w-32 bg-surface-border rounded" />
        <div className="h-10 w-48 bg-surface-border rounded" />
      </div>
    </div>
  );
}
