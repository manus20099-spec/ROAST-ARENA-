export default function Pagination({ page, totalPages, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        ← Prev
      </button>
      <span className="text-gray-400 text-sm">
        Page <span className="text-orange-400 font-semibold">{page}</span> of{' '}
        <span className="font-semibold">{totalPages || 1}</span>
      </span>
      <button
        onClick={onNext}
        disabled={page >= (totalPages || 1)}
        className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        Next →
      </button>
    </div>
  );
}
