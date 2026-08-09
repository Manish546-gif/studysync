// Frontend -> Backend API helper
// - `API_URL` is constructed from `VITE_API_URL` + '/api'.
// - All requests go through `request()` which attaches the JWT from
//   `localStorage.token` as `Authorization: Bearer <token>` when present.
// - `parseRes` attempts to parse JSON and throws a helpful error when
//   the server returns non-JSON (common when backend crashes or restarts).
//
// When changing backend routes or response shapes, update these helpers
// and add matching tests on the server. Expected successful responses are
// JSON objects; error responses should be JSON with an `error` field.
const API_URL = (import.meta.env.VITE_API_URL || '') + '/api';

async function parseRes(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // Helpful error for backend devs: if the server returns HTML (e.g. stack trace)
    // this message makes it clear the frontend expected JSON but got something else.
    throw new Error(`Server returned ${res.status} (${res.headers.get('content-type') || 'unknown'}) instead of JSON. Is the backend restarted?`);
  }
  return data;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  // Default headers for JSON APIs. Note: file uploads use a FormData flow
  // and purposely omit `Content-Type` so the browser can set the multipart boundary.
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`; // attach JWT when available

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await parseRes(res);
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // --- Auth ---
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  googleLogin: (credential) => request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
  getMe: () => request('/auth/me'),
  updateMe: (body) => request('/auth/me', { method: 'PUT', body: JSON.stringify(body) }),

  // --- Rooms ---
  // GET /rooms -> returns array of rooms user has access to
  getRooms: () => request('/rooms'),
  getRoom: (id) => request(`/rooms/${id}`),
  createRoom: (body) => request('/rooms', { method: 'POST', body: JSON.stringify(body) }),
  verifyCode: (code) => request('/rooms/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  joinRoom: (id) => request(`/rooms/${id}/join`, { method: 'POST' }),
  deleteRoom: (id) => request(`/rooms/${id}`, { method: 'DELETE' }),

  // --- Whiteboards ---
  // Whiteboard objects include `actions` (array of stored drawing actions).
  // `saveWhiteboardActions` stores the full actions array for persistence.
  getWhiteboards: () => request('/whiteboards'),
  getWhiteboard: (id) => request(`/whiteboards/${id}`),
  createWhiteboard: (body) => request('/whiteboards', { method: 'POST', body: JSON.stringify(body) }),
  updateWhiteboard: (id, body) => request(`/whiteboards/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  saveWhiteboardActions: (id, actions) =>
    request(`/whiteboards/${id}/actions`, { method: 'PUT', body: JSON.stringify({ actions }) }),
  deleteWhiteboard: (id) => request(`/whiteboards/${id}`, { method: 'DELETE' }),
  shareWhiteboard: (id, email) =>
    request(`/whiteboards/${id}/share`, { method: 'POST', body: JSON.stringify({ email }) }),
  unshareWhiteboard: (id, userId) =>
    request(`/whiteboards/${id}/share`, { method: 'DELETE', body: JSON.stringify({ userId }) }),

  // --- Notebooks ---
  // Simple CRUD for notebooks used to group whiteboards.
  getNotebooks: () => request('/notebooks'),
  createNotebook: (name) => request('/notebooks', { method: 'POST', body: JSON.stringify({ name }) }),
  renameNotebook: (id, name) => request(`/notebooks/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteNotebook: (id) => request(`/notebooks/${id}`, { method: 'DELETE' }),

  // --- Files (room attachments) ---
  // Uploads use a multipart `FormData` POST to `/files/:roomId/upload` and
  // return an object containing `{ file }` (see server/files route).
  getRoomFiles: (roomId) => request(`/files/${roomId}`),
  uploadRoomFile: async (roomId, file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    // Note: we directly use `fetch` here to send `FormData`. Backend should
    // expect `req.file` (multer) and respond with JSON describing the stored file.
    const res = await fetch(`${API_URL}/files/${roomId}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await parseRes(res);
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data;
  },
  deleteRoomFile: (roomId, fileId) => request(`/files/${roomId}/${fileId}`, { method: 'DELETE' }),
  getFileUrl: (roomId, storedName) => `${API_URL}/files/${roomId}/download/${storedName}`,
};
