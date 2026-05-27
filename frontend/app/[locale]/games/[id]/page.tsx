interface GameDetailPageProps {
  params: { locale: string; id: string };
}

export default async function GameDetailPage({ params: { locale: _locale } }: GameDetailPageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-surface-card rounded-xl border border-surface-border text-center">
      <span className="text-5xl mb-4">⚾</span>
      <p className="text-slate-400 text-lg">
        {_locale === "ja" ? "試合詳細は準備中です" : "Game detail coming soon"}
      </p>
    </div>
  );
}
