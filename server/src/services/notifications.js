import { NOTIFICATIONS_KEPT } from '../lib/constants.js';
import { Notification } from '../models/Notification.js';
import { emitToUser } from '../realtime.js';

/**
 * Create an in-app notification and keep only the user's newest 50.
 * Never throws: a failed notification must not break the action that caused it.
 */
export async function notify({ user, type, idea = null, data = {} }) {
  try {
    const doc = await Notification.create({ user, type, idea, data });

    const stale = await Notification.find({ user })
      .sort({ createdAt: -1, _id: -1 })
      .skip(NOTIFICATIONS_KEPT)
      .select('_id')
      .lean();
    if (stale.length > 0) {
      await Notification.deleteMany({ _id: { $in: stale.map((n) => n._id) } });
    }

    emitToUser(String(user), 'notification:new', serializeNotification(doc));
    return doc;
  } catch (err) {
    console.error('[notify] failed:', err.message);
    return null;
  }
}

export function serializeNotification(n) {
  return {
    id: String(n._id),
    type: n.type,
    idea: n.idea ? String(n.idea) : null,
    data: n.data ?? {},
    read: Boolean(n.readAt),
    createdAt: n.createdAt,
  };
}

export async function listNotifications(userId) {
  const items = await Notification.find({ user: userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(NOTIFICATIONS_KEPT)
    .lean();
  const unread = items.filter((n) => !n.readAt).length;
  return { unread, items: items.map(serializeNotification) };
}

export async function markRead(userId, notificationId) {
  await Notification.updateOne(
    { _id: notificationId, user: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
}

export async function markAllRead(userId) {
  await Notification.updateMany({ user: userId, readAt: null }, { $set: { readAt: new Date() } });
}
