/**
 * Thin fetch wrapper. All requests go to /api.
 * On non-ok response, parses JSON error and throws.
 */

async function handleResponse(res) {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data.error?.message || data.message || data.error || message;
    } catch {
      // ignore parse error
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get(path) {
    return fetch(path, { credentials: 'include' }).then(handleResponse);
  },

  post(path, body) {
    return fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse);
  },

  patch(path, body) {
    return fetch(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handleResponse);
  },

  delete(path) {
    return fetch(path, {
      method: 'DELETE',
      credentials: 'include',
    }).then(handleResponse);
  },

  /**
   * For file uploads — do NOT set Content-Type so the browser sets multipart boundary.
   */
  postForm(path, formData) {
    return fetch(path, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(handleResponse);
  },

  patchForm(path, formData) {
    return fetch(path, {
      method: 'PATCH',
      credentials: 'include',
      body: formData,
    }).then(handleResponse);
  },
};

export default api;
