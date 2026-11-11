import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import TagBadge from '../components/TagBadge.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';

export default function ProfilePage() {
  const { displayName } = useParams();
  const { user: currentUser } = useAuth();
  const { addToast } = useToast();

  const [editing, setEditing] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', displayName],
    queryFn: () => api.get(`/api/users/${displayName}`),
  });

  const isMe = currentUser && currentUser.displayName.toLowerCase() === displayName.toLowerCase();

  const handleStartEdit = () => {
    setBioInput(data?.user?.bio || '');
    setNameInput(data?.user?.displayName || '');
    setEditing(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/api/users/me', {
        displayName: nameInput !== data?.user?.displayName ? nameInput : undefined,
        bio: bioInput,
      });
      addToast('Profile updated!', 'success');
      setEditing(false);
      refetch();
    } catch (err) {
      addToast(err.message || 'Failed to update profile.', 'error');
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      await api.postForm('/api/users/me/avatar', formData);
      addToast('Avatar uploaded!', 'success');
      refetch();
    } catch (err) {
      addToast(err.message || 'Failed to upload avatar.', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message || 'User not found.'} />;

  const { user, stats, ideas } = data;

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* ── User Header Card ─────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              {user.avatarPath ? (
                <img
                  src={user.avatarPath}
                  alt={user.displayName}
                  className="w-20 h-20 rounded-full object-cover border-2 border-orange-500"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-orange-500/40 text-orange-400 text-3xl font-black flex items-center justify-center">
                  {user.displayName[0]?.toUpperCase()}
                </div>
              )}
              {isMe && (
                <label className="absolute -bottom-1 -right-1 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-xs px-2 py-1 rounded-full cursor-pointer text-gray-200">
                  {uploadingAvatar ? '...' : '📷'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-black text-white">{user.displayName}</h1>
              <p className="text-xs text-gray-400">
                Founder since {new Date(user.createdAt).toLocaleDateString()}
              </p>
              {user.bio ? (
                <p className="text-sm text-gray-300 max-w-md pt-1">{user.bio}</p>
              ) : (
                <p className="text-xs text-gray-500 italic">No bio provided.</p>
              )}
            </div>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-gray-800 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-around">
            <div className="text-center">
              <span className="text-xs uppercase text-gray-500 font-semibold block">Ideas</span>
              <span className="text-2xl font-black text-white">{stats.ideaCount}</span>
            </div>
            <div className="text-center">
              <span className="text-xs uppercase text-gray-500 font-semibold block">Votes</span>
              <span className="text-2xl font-black text-orange-400">{stats.totalVotes}</span>
            </div>
            <div className="text-center">
              <span className="text-xs uppercase text-gray-500 font-semibold block">Best Rank</span>
              <span className="text-2xl font-black text-amber-400">
                {stats.bestRank ? `#${stats.bestRank}` : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Profile Form (Only for own profile) */}
        {isMe && (
          <div className="mt-6 pt-4 border-t border-gray-800 flex justify-end">
            {!editing ? (
              <button
                type="button"
                onClick={handleStartEdit}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold px-3 py-1.5 rounded-lg border border-gray-700 transition"
              >
                ✏️ Edit Profile
              </button>
            ) : (
              <form onSubmit={handleSaveProfile} className="w-full space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Display Name (changeable once every 30 days)
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      Bio (160 chars max)
                    </label>
                    <input
                      type="text"
                      maxLength={160}
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-1.5 rounded-lg transition"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Public Ranked Ideas ──────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>💡</span> Published Ideas ({ideas.length})
        </h2>

        {ideas.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center bg-gray-900 border border-gray-800 rounded-2xl">
            No published ideas yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideas.map((item) => (
              <Link
                key={item.id}
                to={`/ideas/${item.id}`}
                className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 block transition group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white group-hover:text-orange-400 transition">
                    {item.title}
                  </h3>
                  <span className="text-xs font-black text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                    Score: {item.score}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.tags?.map((t) => (
                    <TagBadge key={t} tag={t} />
                  ))}
                </div>
                <div className="text-xs text-gray-400 flex items-center gap-2">
                  <span>👍 {item.voteCount} votes</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
