import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage.jsx';
import IdeaCard from '../components/IdeaCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { api } from '../lib/api.js';

export default function MyIdeasPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ideas', 'mine'],
    queryFn: () => api.get('/api/ideas?view=mine&limit=50'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 to-gray-950 p-6 rounded-2xl border border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <span>💡</span> My Ideas
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage your startup concepts, submit re-pitches, and review AI feedback.
          </p>
        </div>
        <Link
          to="/ideas/new"
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-xl text-sm transition shadow-sm"
        >
          + Post New Idea
        </Link>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error.message || 'Failed to load your ideas.'} />
      ) : data?.items?.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/40 rounded-2xl border border-gray-800/80">
          <p className="text-gray-400 text-sm mb-4">You have not posted any ideas yet.</p>
          <Link
            to="/ideas/new"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-xl text-sm transition"
          >
            Post Your First Pitch
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.items?.map((idea) => (
            <div key={idea.id} className="relative group">
              <IdeaCard idea={idea} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
