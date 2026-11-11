import { Link } from 'react-router-dom';
import TagBadge from './TagBadge.jsx';

function ScoreBadge({ score }) {
  if (score == null) return null;
  const color =
    score >= 70 ? 'bg-green-900/60 text-green-400 border-green-700/60' :
    score >= 40 ? 'bg-yellow-900/60 text-yellow-400 border-yellow-700/60' :
                 'bg-red-900/60 text-red-400 border-red-700/60';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${color}`}>
      {Number(score).toFixed(0)}
    </span>
  );
}

export default function IdeaCard({ idea, rank }) {
  const ideaId = idea.id || idea._id;
  const preview = idea.previewProblem || idea.rankedPitch?.problem || '';
  const previewText = preview.length > 110 ? preview.slice(0, 110) + '…' : preview;
  const cover = idea.coverImagePath || idea.coverImage;

  return (
    <Link
      to={`/ideas/${ideaId}`}
      className="block bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-orange-500/60 hover:shadow-xl hover:shadow-orange-950/30 transition group"
    >
      {/* Cover image */}
      {cover && (
        <div className="h-36 overflow-hidden bg-gray-950">
          <img
            src={cover}
            alt={idea.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-5 flex flex-col gap-3">
        {/* Top row: rank + title + score */}
        <div className="flex items-start gap-3">
          {rank != null && (
            <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-sm">
              #{rank}
            </span>
          )}
          <h3 className="flex-1 font-bold text-gray-100 group-hover:text-orange-400 transition leading-snug">
            {idea.title}
          </h3>
          <ScoreBadge score={idea.score} />
        </div>

        {/* Preview problem text */}
        {previewText && (
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">{previewText}</p>
        )}

        {/* Tags */}
        {idea.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {idea.tags.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-1 pt-3 border-t border-gray-800 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">by</span>
            <span className="text-gray-300 font-medium">
              {idea.founder?.displayName || 'Founder'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-gray-300 font-semibold">
              🔺 {idea.voteCount ?? 0}
            </span>
            {idea.pitchCount != null && (
              <span className="text-[11px] text-gray-500 font-mono">
                v{idea.pitchCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
