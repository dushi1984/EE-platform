export function TrendChart({ points, labels, empty }: { points: (number | null)[]; labels: string[]; empty: string }) {
  const known = points.filter((p): p is number => p !== null);
  if (!known.length) return <p className="py-8 text-center text-xs text-slate-500">{empty}</p>;

  let last = known[0];
  const vals = points.map((p) => {
    if (p !== null) last = p;
    return last;
  });
  const W = 220;
  const H = 96;
  const pad = 8;
  let min = Math.max(0, Math.min(...vals) - 10);
  let max = Math.min(100, Math.max(...vals) + 5);
  if (max - min < 15) {
    min = Math.max(0, max - 15);
  }
  const xs = vals.map((_, i) => pad + (i * (W - pad * 2)) / Math.max(1, vals.length - 1));
  const ys = vals.map((v) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2));
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const mx = (xs[i - 1] + xs[i]) / 2;
    d += ` C ${mx} ${ys[i - 1]} ${mx} ${ys[i]} ${xs[i]} ${ys[i]}`;
  }
  const area = `${d} L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`;

  return (
    <div dir="ltr">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendFill)" />
        <path d={d} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3.5" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[9px] text-slate-400">
        {labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
}
