import { io } from 'socket.io-client';

/**
 * Singleton socket.io-client instance.
 * Connects to the same origin as the app (proxied to :5000 by Vite in dev).
 */
export const socket = io(window.location.origin, {
  withCredentials: true,
  autoConnect: true,
});

/**
 * Join an idea-specific room to receive real-time updates.
 * @param {string} ideaId
 */
export function joinIdea(ideaId) {
  socket.emit('idea:join', ideaId);
}

/**
 * Leave an idea-specific room.
 * @param {string} ideaId
 */
export function leaveIdea(ideaId) {
  socket.emit('idea:leave', ideaId);
}
