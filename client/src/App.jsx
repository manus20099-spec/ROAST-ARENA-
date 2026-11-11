import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import NewIdeasPage from './pages/NewIdeasPage.jsx';
import MyIdeasPage from './pages/MyIdeasPage.jsx';
import PostIdeaPage from './pages/PostIdeaPage.jsx';
import IdeaPage from './pages/IdeaPage.jsx';
import RepitchPage from './pages/RepitchPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/leaderboard" replace />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/new" element={<NewIdeasPage />} />
          <Route
            path="/my-ideas"
            element={
              <ProtectedRoute>
                <MyIdeasPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ideas/new"
            element={
              <ProtectedRoute>
                <PostIdeaPage />
              </ProtectedRoute>
            }
          />
          <Route path="/ideas/:ideaId" element={<IdeaPage />} />
          <Route
            path="/ideas/:ideaId/repitch"
            element={
              <ProtectedRoute>
                <RepitchPage />
              </ProtectedRoute>
            }
          />
          <Route path="/profile/:displayName" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
}
