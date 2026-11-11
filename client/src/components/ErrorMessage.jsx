export default function ErrorMessage({ message }) {
  return (
    <div className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-red-300 text-sm">
      <span className="font-semibold">Error: </span>
      {message || 'Something went wrong. Please try again.'}
    </div>
  );
}
