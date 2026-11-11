import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="text-center py-24 space-y-4">
      <span className="text-6xl block">💨</span>
      <h1 className="text-3xl font-black text-white">404 — Pitch Not Found</h1>
      <p className="text-gray-400 text-sm max-w-sm mx-auto">
        The page you are looking for does not exist or may have been deleted.
      </p>
      <Link
        to="/leaderboard"
        className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition text-sm shadow-md"
      >
        Return to Leaderboard
      </Link>
    </div>
  );
}
