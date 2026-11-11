import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config } from './config.js';

/**
 * Socket.IO is only a broadcaster. Every change is validated and saved by the REST API
 * first; the server then tells other clients. Clients never send votes or comments
 * through the socket, so the socket can never bypass a rule.
 *
 * Until init() runs (for example in tests) every emit is a safe no-op.
 */
let io = null;
let leaderboardTimer = null;

export const rooms = {
  user: (id) => `user:${id}`,
  idea: (id) => `idea:${id}`,
};

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
  });

  // Identify the user from the same httpOnly cookie the REST API uses.
  io.use((socket, next) => {
    try {
      const header = socket.handshake.headers.cookie || '';
      const token = parseCookie(header).token;
      if (token) {
        const payload = jwt.verify(token, config.jwtSecret);
        socket.data.userId = String(payload.sub);
      }
    } catch {
      // Invalid or expired token: connect anonymously (can still watch public rooms).
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.data.userId) socket.join(rooms.user(socket.data.userId));

    socket.on('idea:join', (ideaId) => {
      if (typeof ideaId === 'string' && /^[a-f\d]{24}$/i.test(ideaId)) socket.join(rooms.idea(ideaId));
    });
    socket.on('idea:leave', (ideaId) => {
      if (typeof ideaId === 'string') socket.leave(rooms.idea(ideaId));
    });
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  io?.to(rooms.user(userId)).emit(event, payload);
}

export function emitToIdea(ideaId, event, payload) {
  io?.to(rooms.idea(ideaId)).emit(event, payload);
}

/** Leaderboard changes are batched: at most one broadcast every 5 seconds. */
export function leaderboardChanged(delayMs = 5000) {
  if (!io || leaderboardTimer) return;
  leaderboardTimer = setTimeout(() => {
    leaderboardTimer = null;
    io?.emit('leaderboard:changed');
  }, delayMs);
}

export function closeRealtime() {
  if (leaderboardTimer) clearTimeout(leaderboardTimer);
  leaderboardTimer = null;
  io?.close();
  io = null;
}
