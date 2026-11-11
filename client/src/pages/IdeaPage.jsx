import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage.jsx';
import InvestorCard from '../components/InvestorCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import TagBadge from '../components/TagBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import VoteButton from '../components/VoteButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../hooks/useSocket.js';
import { api } from '../lib/api.js';
import { joinIdea, leaveIdea } from '../lib/socket.js';

export default function IdeaPage() {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [comments, setComments] = useState([]);

  // Fetch Idea details
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['idea', ideaId],
    queryFn: () => api.get(`/api/ideas/${ideaId}`),
  });

  // Fetch comments
  const fetchComments = async () => {
    try {
      const res = await api.get(`/api/ideas/${ideaId}/comments`);
      setComments(res.comments || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchComments();
  }, [ideaId]);

  // Realtime Socket room connection
  useEffect(() => {
    joinIdea(ideaId);
    return () => {
      leaveIdea(ideaId);
    };
  }, [ideaId]);

  useSocketEvent('idea:updated', (payload) => {
    if (payload.ideaId === ideaId) {
      refetch();
    }
  });

  useSocketEvent('roast:created', (payload) => {
    if (payload.ideaId === ideaId) {
      addToast('A new investor roast just came in!', 'info');
      refetch();
    }
  });

  useSocketEvent('pitch:complete', (payload) => {
    if (payload.ideaId === ideaId) {
      addToast('All roasts are in! Your Pitch is complete.', 'success');
      refetch();
    }
  });

  useSocketEvent('comment:created', (newComment) => {
    if (newComment.idea === ideaId) {
      setComments((prev) => {
        if (prev.some((c) => c.id === newComment.id)) return prev;
        return [...prev, newComment];
      });
    }
  });

  useSocketEvent('comment:removed', (payload) => {
    setComments((prev) => prev.filter((c) => c.id !== payload.id));
  });

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/api/ideas/${ideaId}/comments`, { body: commentText.trim() });
      setCommentText('');
    } catch (err) {
      addToast(err.message || 'Failed to post comment.', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleHideComment = async (commentId) => {
    try {
      await api.post(`/api/ideas/${ideaId}/comments/${commentId}/hide`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      addToast('Comment hidden.', 'info');
    } catch (err) {
      addToast(err.message || 'Failed to hide comment.', 'error');
    }
  };

  const handleReportComment = async (commentId) => {
    try {
      const res = await api.post(`/api/ideas/${ideaId}/comments/${commentId}/report`);
      if (res.hidden) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        addToast('Comment reported and hidden due to reports.', 'info');
      } else {
        addToast('Comment reported.', 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to report comment.', 'error');
    }
  };

  const handleDeleteIdea = async () => {
    if (!window.confirm('Are you sure you want to delete this idea?')) return;
    try {
      await api.delete(`/api/ideas/${ideaId}`);
      addToast('Idea deleted.', 'info');
      navigate('/leaderboard');
    } catch (err) {
      addToast(err.message || 'Failed to delete idea.', 'error');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message || 'Idea not found.'} />;

  const idea = data.idea;
  const leadPitch = data.pitch;
  const history = data.history || [];
  const isFounder = idea.viewerIsFounder;

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header Card ──────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        {idea.coverImagePath && (
          <div className="h-48 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-6 overflow-hidden">
            <img
              src={idea.coverImagePath}
              alt={idea.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-black text-white">{idea.title}</h1>
              {leadPitch?.status === 'pending' && (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-bold animate-pulse">
                  Pending Roasts...
                </span>
              )}
              {leadPitch?.flagged && (
                <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs px-2.5 py-1 rounded-full font-bold">
                  Flagged Pitch
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span>
                By{' '}
                <Link
                  to={`/profile/${idea.founder.displayName}`}
                  className="text-orange-400 hover:underline font-medium"
                >
                  {idea.founder.displayName}
                </Link>
              </span>
              <span>•</span>
              <span>Pitches: {idea.pitchCount} of 5</span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {idea.tags?.map((t) => (
                <TagBadge key={t} tag={t} />
              ))}
            </div>
          </div>

          {/* Voting & Score Stats */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
            <div className="flex items-center gap-3">
              <div className="text-center sm:text-right">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold block">
                  Score
                </span>
                <span className="text-3xl font-black text-orange-400">
                  {idea.score}
                </span>
              </div>
              <div className="text-center sm:text-right border-l border-gray-800 pl-3">
                <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold block">
                  AI Avg
                </span>
                <span className="text-2xl font-bold text-gray-200">
                  {idea.aiScore ? `${idea.aiScore}/10` : '—'}
                </span>
              </div>
            </div>

            <VoteButton
              ideaId={idea.id}
              voted={idea.hasVoted}
              voteCount={idea.voteCount}
              disabled={isFounder || !idea.onLeaderboard}
            />
          </div>
        </div>

        {/* Founder Controls: Re-pitch & Delete */}
        {isFounder && (
          <div className="mt-6 pt-4 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-400">
              {idea.pitchCount >= 5
                ? 'Maximum 5 pitches reached for this idea.'
                : leadPitch?.status === 'pending'
                ? 'Wait for the current pitch to finish before re-pitching.'
                : 'Improve your concept based on feedback and re-pitch!'}
            </div>
            <div className="flex items-center gap-3">
              {idea.pitchCount < 5 && leadPitch?.status !== 'pending' && (
                <Link
                  to={`/ideas/${idea.id}/repitch`}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition"
                >
                  🚀 Submit Re-pitch (v{idea.pitchCount + 1})
                </Link>
              )}
              <button
                type="button"
                onClick={handleDeleteIdea}
                className="text-xs text-red-400 hover:text-red-300 font-medium px-2 py-1"
              >
                Delete Idea
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Ranked Pitch Section ────────────────────────────────────────────── */}
      {leadPitch && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📄</span> Pitch v{leadPitch.version}
                {leadPitch.version === idea.pitchCount && (
                  <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-normal">
                    Latest
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Roast Level:{' '}
                <span className="capitalize font-medium text-orange-400">
                  {leadPitch.roastLevel}
                </span>
              </p>
            </div>
            {leadPitch.aiAverage && (
              <div className="text-right">
                <span className="text-xs text-gray-500">AI Average</span>
                <span className="text-xl font-bold text-white block">
                  {leadPitch.aiAverage} / 10
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                The Problem
              </h3>
              <p className="text-sm text-gray-200 leading-relaxed bg-gray-950/60 p-4 rounded-xl border border-gray-800/80">
                {leadPitch.problem}
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                The Solution
              </h3>
              <p className="text-sm text-gray-200 leading-relaxed bg-gray-950/60 p-4 rounded-xl border border-gray-800/80">
                {leadPitch.solution}
              </p>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-bold">
                Target Customer
              </h3>
              <p className="text-sm text-gray-200 leading-relaxed bg-gray-950/60 p-4 rounded-xl border border-gray-800/80">
                {leadPitch.customer}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Investor Roasts (3 Panels) ──────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>🔥</span> The Investor Roasts
        </h2>

        {leadPitch?.roasts?.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
            <p className="text-gray-400 text-sm animate-pulse">
              Investors are evaluating the pitch right now...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {leadPitch?.roasts?.map((roast) => (
              <InvestorCard key={roast.id} roast={roast} />
            ))}
          </div>
        )}
      </div>

      {/* ── Score History (Before/After Re-pitch Comparison) ────────────────── */}
      {history.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span>📈</span> Re-pitch Progression History
          </h3>
          <div className="divide-y divide-gray-800">
            {history.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-200">Pitch v{h.version}</span>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">
                    AI Score: <strong className="text-white">{h.aiAverage ?? '—'}</strong>
                  </span>
                  {h.change !== null && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        h.change > 0
                          ? 'bg-green-500/10 text-green-400'
                          : h.change < 0
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {h.change > 0 ? `▲ +${h.change}` : h.change < 0 ? `▼ ${h.change}` : '0.00'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Community Comments ──────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>💬</span> Discussion ({comments.length})
        </h2>

        {/* Comment form */}
        {user ? (
          <form onSubmit={handleAddComment} className="space-y-3">
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Leave constructive feedback or ask a question (500 chars max)..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
            />
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-gray-500">{commentText.length}/500</span>
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition disabled:opacity-50"
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-gray-800/40 rounded-xl text-center text-sm text-gray-400">
            <Link to="/login" className="text-orange-400 hover:underline font-semibold">
              Log in
            </Link>{' '}
            to join the discussion and leave feedback.
          </div>
        )}

        {/* Comments list */}
        <div className="space-y-4 pt-2">
          {comments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="bg-gray-950/60 border border-gray-800 p-4 rounded-xl space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-200">
                      {c.author?.displayName ?? 'Anonymous'}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {isFounder && (
                      <button
                        type="button"
                        onClick={() => handleHideComment(c.id)}
                        className="text-gray-400 hover:text-red-400"
                        title="Founder can hide comments"
                      >
                        Hide
                      </button>
                    )}
                    {user && user.displayName !== c.author?.displayName && (
                      <button
                        type="button"
                        onClick={() => handleReportComment(c.id)}
                        className="text-gray-500 hover:text-amber-400"
                        title="Report inappropriate comment"
                      >
                        Report
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{c.body}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
