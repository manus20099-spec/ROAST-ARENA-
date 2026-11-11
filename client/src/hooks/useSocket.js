import { useEffect } from 'react';
import { socket } from '../lib/socket.js';

/**
 * Subscribes to a socket.io event for the lifetime of the component.
 *
 * @param {string} event  - The socket event name to listen for.
 * @param {Function} handler - Callback invoked with the event payload.
 */
export function useSocketEvent(event, handler) {
  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}
