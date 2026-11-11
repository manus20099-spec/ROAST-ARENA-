import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function VoteButton({ ideaId, voted, voteCount, disabled }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [optimisticVoted, setOptimisticVoted] = useState(voted);
  const [optimisticCount, setOptimisticCount] = useState(voteCount ?? 0);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post(`/api/ideas/${ideaId}/vote`, {}),
    onMutate: () => {
      // Optimistic update
      setOptimisticVoted((v) => !v);
      setOptimisticCount((c) => (optimisticVoted ? c - 1 : c + 1));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
    onError: () => {
      // Revert optimistic update
      setOptimisticVoted(voted);
      setOptimisticCount(voteCount ?? 0);
    },
  });

  const isDisabled = !user || disabled || isPending;

  return (
    <button
      onClick={() => !isDisabled && mutate()}
      disabled={isDisabled}
      title={!user ? 'Login to vote' : disabled ? "Can't vote on your own Idea" : ''}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold text-sm transition ${
        optimisticVoted
          ? 'bg-orange-500 border-orange-400 text-white hover:bg-orange-600'
          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="text-base">{optimisticVoted ? '🔥' : '🔺'}</span>
      <span>{optimisticCount}</span>
      <span className="hidden sm:inline">{optimisticVoted ? 'Voted' : 'Vote'}</span>
    </button>
  );
}
