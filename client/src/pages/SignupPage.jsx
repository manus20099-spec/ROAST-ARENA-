import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      await signup({ email, displayName, password });
      navigate('/leaderboard');
    } catch (err) {
      setErrorMsg(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <span className="text-4xl block">🚀</span>
          <h1 className="text-2xl font-black text-white">Create Founder Account</h1>
          <p className="text-xs text-gray-400">
            Join Startup Roast Arena to pitch, get roasted, and vote.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Display Name (3-20 chars, letters/numbers/_)
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={20}
              pattern="^[A-Za-z0-9_]+$"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Ali_Founder"
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Email Address (no temporary/disposable emails)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition shadow-lg text-sm disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-400 hover:underline font-semibold">
            Log in here
          </Link>
        </p>
      </div>
    </div>
  );
}
