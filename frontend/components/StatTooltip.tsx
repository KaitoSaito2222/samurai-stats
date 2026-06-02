"use client";

import { useState, useRef, useEffect } from "react";

interface StatDef {
  label: string;
  desc: string;
}

const STATS: Record<string, { ja: StatDef; en: StatDef }> = {
  avg: {
    ja: { label: "打率（AVG）", desc: "打数に占めるヒットの割合。.300以上は高水準" },
    en: { label: "Batting Average (AVG)", desc: "Hits ÷ At-bats. .300+ is considered excellent." },
  },
  ops: {
    ja: { label: "OPS", desc: "出塁率＋長打率の合計。打者の総合的な攻撃力を示す指標。.900以上はエリートレベル" },
    en: { label: "OPS (On-base + Slugging)", desc: "OBP + SLG combined. Measures total offensive value. .900+ is elite." },
  },
  hr: {
    ja: { label: "本塁打（HR）", desc: "ホームラン数" },
    en: { label: "Home Runs (HR)", desc: "Total home runs hit." },
  },
  rbi: {
    ja: { label: "打点（RBI）", desc: "ランナーをホームに返した回数（本塁打自身を含む）" },
    en: { label: "RBI (Runs Batted In)", desc: "Runs scored due to the batter's plate appearance." },
  },
  era: {
    ja: { label: "防御率（ERA）", desc: "9イニングあたりの自責点の平均。3.00未満が優秀、2.00未満はエース級" },
    en: { label: "ERA (Earned Run Average)", desc: "Earned runs allowed per 9 innings. Under 3.00 is excellent, under 2.00 is ace-level." },
  },
  whip: {
    ja: { label: "WHIP", desc: "1イニングあたりの四球＋被安打の合計。1.00未満はエリートレベル" },
    en: { label: "WHIP (Walks + Hits / IP)", desc: "Baserunners allowed per inning pitched. Under 1.00 is elite." },
  },
  wins: {
    ja: { label: "勝利（W）", desc: "投手の勝利数" },
    en: { label: "Wins (W)", desc: "Pitcher's win total." },
  },
  strikeouts: {
    ja: { label: "奪三振（K）", desc: "三振で打者を打ち取った数。9イニングあたりの奪三振数（K/9）も参考指標" },
    en: { label: "Strikeouts (K)", desc: "Total batters struck out. K/9 (per 9 innings) is also a useful reference." },
  },
  xba: {
    ja: { label: "期待打率（xBA）", desc: "打球の速度・角度から統計的に算出した期待打率。Statcastデータ使用。実際の打率との乖離は運不運を示す" },
    en: { label: "xBA (Expected Batting Avg)", desc: "Expected AVG based on exit velocity and launch angle (Statcast). Gap vs. actual AVG reflects luck." },
  },
  xslg: {
    ja: { label: "期待長打率（xSLG）", desc: "打球の質から算出した期待長打率。Statcastデータ使用" },
    en: { label: "xSLG (Expected Slugging)", desc: "Expected SLG based on quality of contact (Statcast)." },
  },
  "barrel-rate": {
    ja: { label: "バレル率", desc: "ホームランや長打になりやすい、理想的な打球速度・角度（バレル）を記録した割合。8%以上が優秀" },
    en: { label: "Barrel Rate", desc: "% of batted balls at ideal exit velocity + launch angle combination for extra-base hits. 8%+ is excellent." },
  },
  "hard-hit": {
    ja: { label: "ハードヒット率", desc: "打球速度95マイル（約153km/h）以上の打球の割合。強い打球の頻度を示す" },
    en: { label: "Hard Hit Rate", desc: "% of batted balls at 95+ mph exit velocity. Measures how frequently a batter hits the ball hard." },
  },
  "exit-velocity": {
    ja: { label: "平均打球速度", desc: "打球の平均速度（mph）。速いほど安打・長打になりやすい。90mph以上が優秀" },
    en: { label: "Exit Velocity (Avg)", desc: "Average speed off the bat in mph. Higher = more likely to be a hit or extra-base hit. 90mph+ is above average." },
  },
  "launch-angle": {
    ja: { label: "平均打球角度", desc: "打球の平均垂直角度。10〜25°がライナー、25〜50°がフライ、0〜10°がゴロ" },
    en: { label: "Launch Angle (Avg)", desc: "Average vertical angle off the bat. 10-25° = line drive, 25-50° = fly ball, 0-10° = ground ball." },
  },
};

interface StatTooltipProps {
  term: string;
  locale: string;
  children?: React.ReactNode;
}

export default function StatTooltip({ term, locale, children }: StatTooltipProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const stat = STATS[term];
  if (!stat) {
    return <span>{children}</span>;
  }

  const lang = locale === "ja" ? "ja" : "en";
  const { label, desc } = stat[lang];

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1">
      <span
        className="border-b border-dashed border-surface-outline cursor-help"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        {children ?? label}
      </span>
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-surface-muted text-ink-muted text-[10px] font-bold cursor-help select-none leading-none"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </span>

      {open && (
        <span className="absolute bottom-full left-0 mb-2 z-50 block w-64 pointer-events-none">
          <span className="block bg-navy text-white text-xs rounded p-3 shadow-float">
            <span className="block font-sans font-semibold uppercase tracking-wide text-gold mb-1">{label}</span>
            <span className="block font-serif text-white/80 leading-relaxed">{desc}</span>
          </span>
          {/* Arrow */}
          <span className="block w-0 h-0 ml-3 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-navy" />
        </span>
      )}
    </span>
  );
}
