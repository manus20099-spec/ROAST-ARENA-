const TAG_COLORS = {
  fintech: 'bg-blue-900 text-blue-300 border-blue-700',
  healthtech: 'bg-green-900 text-green-300 border-green-700',
  edtech: 'bg-purple-900 text-purple-300 border-purple-700',
  ecommerce: 'bg-pink-900 text-pink-300 border-pink-700',
  saas: 'bg-cyan-900 text-cyan-300 border-cyan-700',
  agritech: 'bg-lime-900 text-lime-300 border-lime-700',
  logistics: 'bg-orange-900 text-orange-300 border-orange-700',
  ai: 'bg-violet-900 text-violet-300 border-violet-700',
  other: 'bg-gray-800 text-gray-300 border-gray-600',
};

export default function TagBadge({ tag }) {
  const colorClass = TAG_COLORS[tag?.toLowerCase()] || TAG_COLORS.other;
  return (
    <span
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass} capitalize`}
    >
      {tag}
    </span>
  );
}
