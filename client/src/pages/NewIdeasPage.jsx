import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import ErrorMessage from '../components/ErrorMessage.jsx';
import IdeaCard from '../components/IdeaCard.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import Pagination from '../components/Pagination.jsx';
import { api } from '../lib/api.js';

const TAGS = [
  'All',
  'EdTech',
  'FinTech',
  'HealthTech',
  'AI/ML',
  'E-commerce',
  'Social',
  'Gaming',
  'AgriTech',
  'Other',
];

export default function NewIdeasPage() {
  const [page, setPage] = useState(1);
  const [tag, setTag] = useState('All');
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['ideas', 'new', page, tag, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        view: 'new',
        page: String(page),
        limit: '12',
      });
      if (tag !== 'All') params.set('tag', tag);
      if (search.trim()) params.set('q', search.trim());
      return api.get(`/api/ideas?${params.toString()}`);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-gray-900 to-gray-950 p-6 rounded-2xl border border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
            <span>✨</span> New Ideas
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            The freshest pitches submitted by student founders.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search ideas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-gray-800 text-gray-100 placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTag(t);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              tag === t
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error.message || 'Failed to load new ideas.'} />
      ) : data?.items?.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/40 rounded-2xl border border-gray-800/80">
          <p className="text-gray-400 text-sm">No ideas found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.items?.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}

      {data && (
        <Pagination
          page={page}
          total={data.total}
          limit={data.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
