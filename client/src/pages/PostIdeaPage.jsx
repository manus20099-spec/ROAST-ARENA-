import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useToast } from '../components/Toast.jsx';
import { api } from '../lib/api.js';

const TAGS = [
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

const postIdeaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters.')
    .max(80, 'Title cannot exceed 80 characters.'),
  tags: z.array(z.string()).max(3, 'Select up to 3 tags maximum.'),
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

export default function PostIdeaPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(postIdeaSchema),
    defaultValues: {
      title: '',
      tags: [],
      problem: '',
      solution: '',
      customer: '',
      roastLevel: 'medium',
    },
  });

  const selectedTags = watch('tags') || [];

  const toggleTag = (t) => {
    if (selectedTags.includes(t)) {
      setValue('tags', selectedTags.filter((x) => x !== t));
    } else {
      if (selectedTags.length < 3) {
        setValue('tags', [...selectedTags, t]);
      } else {
        addToast('Maximum 3 tags allowed.', 'error');
      }
    }
  };

  const onSubmit = async (values) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.post('/api/ideas', values);
      addToast('Idea submitted! AI investors are now roasting your pitch.', 'success');
      navigate(`/ideas/${res.idea.id}`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit idea.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
          <span>🚀</span> Pitch Your Startup Idea
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Submit your concept to our panel of 3 AI investors. Real rules, sharp roasts, fake funding.
        </p>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1.5">
              Idea Title <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. CampusEats"
              {...register('title')}
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
            />
            {errors.title && (
              <p className="text-red-400 text-xs mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1.5">
              Tags (select up to 3)
            </label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-gray-800/60 text-gray-300 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            {errors.tags && (
              <p className="text-red-400 text-xs mt-1">{errors.tags.message}</p>
            )}
          </div>

          {/* Problem */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-semibold text-gray-200">
                The Problem <span className="text-orange-500">*</span>
              </label>
              <span className="text-[11px] text-gray-500">20 - 600 chars</span>
            </div>
            <textarea
              rows={3}
              placeholder="What pain point do users experience? Be specific."
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
                The Solution <span className="text-orange-500">*</span>
              </label>
              <span className="text-[11px] text-gray-500">20 - 600 chars</span>
            </div>
            <textarea
              rows={3}
              placeholder="How does your product solve this problem?"
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
                Target Customer <span className="text-orange-500">*</span>
              </label>
              <span className="text-[11px] text-gray-500">20 - 300 chars</span>
            </div>
            <textarea
              rows={2}
              placeholder="Who specifically will pay for or use this?"
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
                { level: 'mild', title: '🌱 Mild', desc: 'Constructive & gentle' },
                { level: 'medium', title: '🔥 Medium', desc: 'Honest & playful' },
                { level: 'spicy', title: '🌶️ Spicy', desc: 'Brutally hilarious' },
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
            {submitting ? 'Submitting to Investors...' : 'Enter the Arena'}
          </button>
        </form>
      </div>
    </div>
  );
}
