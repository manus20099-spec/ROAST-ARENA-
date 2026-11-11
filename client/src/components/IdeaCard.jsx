import { Link } from 'react-router-dom';
import TagBadge from './TagBadge.jsx';

function ScoreBadge({ score }) {
  if (score == null) return null;
  const color =
    score >= 7 ? 'bg-green-900 text-green-400 border-green-700' :
    score >= 4 ? 'bg-yellow-900 text-yellow-400 border-yellow-700' :
                 'bg-red-900 text-red-400 border-red-700';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

const ROAST_LEVEL_COLORS = {
  Mild: 'text-green-400',
  Medium: 'text-yellow-400',
  Spicy: 'text-red-400',
};

export default function IdeaCard({ idea, rank }) {
  const previewText = idea.rankedPitch?.problem
    ? idea.rankedPitch.problem.slice(0, 100) + (idea.rankedPitch.problem.length > 100 ? '…' : '')
    : '';

  return (
    <Link
      to={`/ideas/${idea._id}`}
      className="block bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-900/20 transition group"
    >
      {/* Cover image */}
      {idea.coverImage && (
        <div className="h-36 overflow-hidden bg-gray-900">
          <img
            src={idea.coverImage}
            alt={idea.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-4 flex flex-col gap-2">
        {/* Top row: rank + title + score */}
        <div className="flex items-start gap-3">
          {rank != null && (
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold text-sm">
              {rank}
            </span>
          )}
          <h3 className="flex-1 font-semibold text-gray-100 group-hover:text-orange-400 transition leading-tight">
            {idea.title}
          </h3>
          <ScoreBadge score={idea.aiAverage} />
        </div>

        {/* Preview problem text */}
        {previewText && (
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{previewText}</p>
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
        <div className="flex items-center justify-between mt-1 pt-2 border-t border-gray-700/50">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="text-gray-500">by</span>
            <span className="text-gray-300 font-medium">
              {idea.founder?.displayName || 'Anonymous'}
            </span>
            {idea.rankedPitch?.roastLevel && (
              <span className={`text-xs font-semibold ${ROAST_LEVEL_COLORS[idea.rankedPitch.roastLevel] || 'text-gray-400'}`}>
                🌶 {idea.rankedPitch.roastLevel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              🔺 <span className="text-gray-300">{idea.voteCount ?? 0}</span>
            </span>
            {idea.pitchCount != null && (
              <span className="text-xs text-gray-500">
                v{idea.pitchCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
