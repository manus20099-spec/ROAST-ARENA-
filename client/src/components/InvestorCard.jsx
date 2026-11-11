const INVESTOR_META = {
  strict: { emoji: '🧐', label: 'Seth Sahab' },
  funny: { emoji: '😂', label: 'Bhai Jaan Comedian' },
  dreamer: { emoji: '🌈', label: 'Visionary Aapa' },
  'Seth Sahab': { emoji: '🧐', label: 'Seth Sahab' },
  'Bhai Jaan Comedian': { emoji: '😂', label: 'Bhai Jaan Comedian' },
  'Visionary Aapa': { emoji: '🌈', label: 'Visionary Aapa' },
};

function ScoreBar({ score }) {
  const pct = Math.round(((score ?? 0) / 10) * 100);
  const color =
    score >= 7 ? 'bg-green-400' : score >= 4 ? 'bg-yellow-400' : 'bg-red-400';
  const textColor =
    score >= 7 ? 'text-green-400' : score >= 4 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${textColor}`}>
        {score ?? '—'}<span className="text-gray-500 text-xs">/10</span>
      </span>
    </div>
  );
}

export default function InvestorCard({ roast }) {
  if (!roast) return null;

  const { investor, score, roast: roastText, tip, offer, source } = roast;
  const meta = INVESTOR_META[investor] || { emoji: '💼', label: investor };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.emoji}</span>
          <div>
            <p className="font-semibold text-gray-100 leading-tight">{meta.label}</p>
            <p className="text-xs text-gray-500">Investor</p>
          </div>
        </div>
        {source === 'fallback' && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-400 text-amber-900">
            Offline Investor
          </span>
        )}
      </div>

      {/* Score bar */}
      <ScoreBar score={score} />

      {/* Roast text */}
      {roastText && (
        <div className="text-gray-300 text-sm leading-relaxed border-l-2 border-orange-500/50 pl-3 italic">
          "{roastText}"
        </div>
      )}

      {/* Tip */}
      {tip && (
        <div className="text-sm text-gray-400">
          <span className="text-orange-400 font-semibold">💡 Tip: </span>
          {tip}
        </div>
      )}

      {/* Offer */}
      {offer && (
        <div className="text-sm font-medium text-green-400 bg-green-900/20 border border-green-800/40 rounded-lg px-3 py-2">
          💰 Offer: Rs {(offer.amountLakh ?? offer.amount)?.toLocaleString()} lakh for {offer.equityPercent ?? offer.equity}%
        </div>
      )}
    </div>
  );
}
