import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../hooks/useSocket.js';
import { api } from '../lib/api.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications if logged in
  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const data = await api.get('/api/notifications');
      setNotifications(data.items || []);
      setUnreadCount(data.unread || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [user]);

  // Listen to real-time notification
  useSocketEvent('notification:new', (notif) => {
    setNotifications((prev) => [notif, ...prev.slice(0, 49)]);
    setUnreadCount((c) => c + 1);
  });

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await api.post(`/api/notifications/${notif.id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
      } catch {
        // ignore
      }
    }
    setShowBellDropdown(false);
    if (notif.idea) {
      navigate(`/ideas/${notif.idea}`);
    }
  };

  return (
    <header className="border-b border-gray-800 bg-gray-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo & Navigation Tabs */}
        <div className="flex items-center space-x-6">
          <Link to="/leaderboard" className="flex items-center space-x-2 font-bold text-xl text-orange-500 hover:text-orange-400">
            <span className="text-2xl">🔥</span>
            <span>Roast Arena</span>
          </Link>
          <nav className="hidden sm:flex space-x-2">
            <NavLink
              to="/leaderboard"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-orange-500/10 text-orange-400' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              Leaderboard
            </NavLink>
            <NavLink
              to="/new"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-orange-500/10 text-orange-400' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              New Ideas
            </NavLink>
            {user && (
              <NavLink
                to="/my-ideas"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive ? 'bg-orange-500/10 text-orange-400' : 'text-gray-300 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                My Ideas
              </NavLink>
            )}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <Link
                to="/ideas/new"
                className="bg-orange-500 hover:bg-orange-600 text-white font-medium px-3.5 py-1.5 rounded-lg text-sm transition shadow-sm"
              >
                + Post Idea
              </Link>

              {/* Notification Bell */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowBellDropdown(!showBellDropdown)}
                  className="relative p-2 text-gray-300 hover:text-white rounded-lg hover:bg-gray-800 transition"
                  title="Notifications"
                >
                  <span className="text-xl">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showBellDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-2 z-50">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700">
                      <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-xs text-orange-400 hover:underline"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-700/50">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-gray-400 p-4 text-center">No notifications yet.</p>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 text-xs cursor-pointer hover:bg-gray-700/60 transition flex flex-col gap-1 ${
                              !n.read ? 'bg-gray-700/30 font-medium' : 'text-gray-400'
                            }`}
                          >
                            <span className="text-gray-200">
                              {n.type === 'comment' && '💬 New comment on your idea'}
                              {n.type === 'vote_milestone' && `🎉 Milestone: ${n.data?.milestone} votes!`}
                              {n.type === 'top10_enter' && '🚀 Your idea entered the Top 10!'}
                              {n.type === 'top10_exit' && '📉 Your idea left the Top 10'}
                              {n.type === 'comment_hidden' && '⚠️ A comment on your idea was hidden'}
                              {n.type === 'pitch_flagged' && '🚩 Your pitch was flagged for review'}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Link */}
              <Link
                to={`/profile/${user.displayName}`}
                className="flex items-center space-x-2 text-sm text-gray-200 hover:text-white bg-gray-800/80 px-2.5 py-1.5 rounded-lg border border-gray-700/60"
              >
                {user.avatarPath ? (
                  <img src={user.avatarPath} alt={user.displayName} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-xs flex items-center justify-center font-bold">
                    {user.displayName[0]?.toUpperCase()}
                  </span>
                )}
                <span>{user.displayName}</span>
              </Link>

              <button
                type="button"
                onClick={logout}
                className="text-xs text-gray-400 hover:text-red-400 transition px-2 py-1"
              >
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium px-3.5 py-1.5 rounded-lg transition"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
