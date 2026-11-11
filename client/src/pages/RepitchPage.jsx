import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../lib/api.js';

const repitchSchema = z.object({
  problem: z
    .string()
    .trim()
    .min(20, 'Problem must be at least 20 characters.')
    .max(600, 'Problem cannot exceed 600 characters.'),
  solution: z
    .string()
    .trim()
    .min(20, 'Solution must be at least 20 characters.')
    .max(600, 'Solution cannot exceed 600 characters.'),
  customer: z
    .string()
    .trim()
    .min(20, 'Customer description must be at least 20 characters.')
    .max(300, 'Customer description cannot exceed 300 characters.'),
  roastLevel: z.enum(['mild', 'medium', 'spicy']),
});

export default function RepitchPage() {
  const { ideaId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['idea', ideaId],
    queryFn: () => api.get(`/api/ideas/${ideaId}`),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(repitchSchema),
    defaultValues: {
      problem: '',
      solution: '',
      customer: '',
      roastLevel: 'medium',
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message || 'Failed to load idea.'} />;

  const idea = data.idea;
  const leadPitch = data.pitch;

  const onSubmit = async (values) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.post(`/api/ideas/${ideaId}/pitches`, values);
      addToast('Re-pitch submitted! Investors are generating your updated roasts.', 'success');
      navigate(`/ideas/${ideaId}`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit re-pitch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
          <span>🔄</span> Re-pitch: {idea.title}
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Submit pitch v{idea.pitchCount + 1} of 5. Text is immutable after submission; your score progression is tracked on the idea.
        </p>

        {leadPitch && (
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800/80 mb-6 text-xs space-y-1">
            <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">
              Previous Pitch Scores
            </span>
            <div className="flex items-center gap-4 text-sm text-gray-200">
              <span>
                v{leadPitch.version} AI Average: <strong>{leadPitch.aiAverage ?? '—'} / 10</strong>
              </span>
              <span>•</span>
              <span>Current Score: <strong>{idea.score}</strong></span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Problem */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-semibold text-gray-200">
                Refined Problem <span className="text-orange-500">*</span>
              </label>
              <span className="text-[11px] text-gray-500">20 - 600 chars</span>
            </div>
            <textarea
              rows={3}
              placeholder="How have you sharpened your problem statement?"
              {...register('problem')}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
            />
            {errors.problem && (
              <p className="text-red-400 text-xs mt-1">{errors.problem.message}</p>
            )}
          </div>

          {/* Solution */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-semibold text-gray-200">
                Refined Solution <span className="text-orange-500">*</span>
              </label>
              <span className="text-[11px] text-gray-500">20 - 600 chars</span>
            </div>
            <textarea
              rows={3}
              placeholder="How does your improved solution address investor concerns?"
              {...register('solution')}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
            />
            {errors.solution && (
              <p className="text-red-400 text-xs mt-1">{errors.solution.message}</p>
            )}
          </div>

          {/* Customer */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-semibold text-gray-200">
                Refined Target Customer <span className="text-orange-500">*</span>
              </label>
              <span className="text-[11px] text-gray-500">20 - 300 chars</span>
            </div>
            <textarea
              rows={2}
              placeholder="Who specifically will pay for this?"
              {...register('customer')}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
            />
            {errors.customer && (
              <p className="text-red-400 text-xs mt-1">{errors.customer.message}</p>
            )}
          </div>

          {/* Roast Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">
              Roast Level (changes tone only, never scoring)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { level: 'mild', title: '🌱 Mild', desc: 'Constructive' },
                { level: 'medium', title: '🔥 Medium', desc: 'Honest' },
                { level: 'spicy', title: '🌶️ Spicy', desc: 'Unfiltered' },
              ].map((item) => (
                <label
                  key={item.level}
                  className={`border rounded-xl p-3 cursor-pointer flex flex-col transition text-center ${
                    watch('roastLevel') === item.level
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    value={item.level}
                    {...register('roastLevel')}
                    className="sr-only"
                  />
                  <span className="text-sm font-bold text-gray-100">{item.title}</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">{item.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 rounded-xl transition shadow-lg disabled:opacity-50"
          >
            {submitting ? 'Submitting Re-pitch...' : `Submit Pitch v${idea.pitchCount + 1}`}
          </button>
        </form>
      </div>
    </div>
  );
}
