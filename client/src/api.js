/**
 * Thin fetch wrapper.
 * Always sends the session cookie (same-origin in production, proxied in
 * dev) and turns any non-2xx response into a real Error the UI can show.
 */

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Reads are reused for a few seconds.
 *
 * Every page re-fetched the same handful of lists on mount, and each of those
 * is a round trip to the database, so moving between pages left the content
 * area empty for a second or more. A short window makes moving around instant
 * without the data ever being meaningfully out of date, and any successful
 * write clears it immediately so a saved change is never hidden.
 *
 * Concurrent identical reads share one request, which is always safe.
 */
const READ_TTL_MS = 4000;
const readCache = new Map();
const inflightReads = new Map();

function invalidateReads() {
  readCache.clear();
  inflightReads.clear();
}

async function request(method, path, body) {
  const isRead = method === 'GET';

  if (isRead) {
    const hit = readCache.get(path);
    if (hit && hit.expires > Date.now()) return hit.value;
    const pending = inflightReads.get(path);
    if (pending) return pending;
  }

  const run = async () => {
    let res;
    try {
      res = await fetch(path, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'network', 'OFFLINE');
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new ApiError(res.status, 'Malformed response from the server', 'BAD_JSON');
      }
    }

    if (!res.ok) {
      throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.code);
    }

    if (isRead) {
      readCache.set(path, { value: data, expires: Date.now() + READ_TTL_MS });
    } else {
      // A write just changed something the cached reads describe.
      invalidateReads();
    }
    return data;
  };

  if (!isRead) return run();

  const started = run().finally(() => inflightReads.delete(path));
  inflightReads.set(path, started);
  return started;
}

const qs = (params) => {
  const usable = Object.entries(params ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  );
  return usable.length ? `?${new URLSearchParams(usable)}` : '';
};

export const api = {
  // Drop every cached read. Signing out must always call this, so that a
  // failed logout cannot leave the next person looking at the previous
  // session's lists.
  invalidateCache: invalidateReads,

  // auth
  login: (email, password) => request('POST', '/api/auth/login', { email, password }),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me'),

  // dashboard + banner
  stats: () => request('GET', '/api/meta/stats'),
  announcements: () => request('GET', '/api/meta/announcements'),
  createAnnouncement: (row) => request('POST', '/api/meta/announcements', row),
  updateAnnouncement: (id, patch) => request('PATCH', `/api/meta/announcements/${id}`, patch),
  deleteAnnouncement: (id) => request('DELETE', `/api/meta/announcements/${id}`),

  // students
  students: (filters) => request('GET', `/api/students${qs(filters)}`),
  student: (id) => request('GET', `/api/students/${id}`),
  createStudent: (row) => request('POST', '/api/students', row),
  updateStudent: (id, patch) => request('PATCH', `/api/students/${id}`, patch),
  deleteStudent: (id) => request('DELETE', `/api/students/${id}`),
  assignTeacher: (id, teacherId, subject) =>
    request('POST', `/api/students/${id}/teachers`, { teacher_id: teacherId, subject }),
  unassignTeacher: (id, teacherId) =>
    request('DELETE', `/api/students/${id}/teachers/${teacherId}`),
  assignGuardian: (id, parentId, relation) =>
    request('POST', `/api/students/${id}/guardians`, { parent_id: parentId, relation }),
  unassignGuardian: (id, parentId) =>
    request('DELETE', `/api/students/${id}/guardians/${parentId}`),

  // notes
  notes: () => request('GET', '/api/notes'),
  createNote: (row) => request('POST', '/api/notes', row),
  updateNote: (id, patch) => request('PATCH', `/api/notes/${id}`, patch),
  deleteNote: (id) => request('DELETE', `/api/notes/${id}`),

  // test results
  createAssessment: (row) => request('POST', '/api/assessments', row),

  // payments
  createPayment: (row) => request('POST', '/api/payments', row),
  deletePayment: (id) => request('DELETE', `/api/payments/${id}`),

  // users
  users: (role) => request('GET', `/api/users${qs({ role })}`),
  createUser: (row) => request('POST', '/api/users', row),
  updateUser: (id, patch) => request('PATCH', `/api/users/${id}`, patch),
  deleteUser: (id) => request('DELETE', `/api/users/${id}`),
  userSections: (id) => request('GET', `/api/users/${id}/sections`),
  setUserSections: (id, sections) => request('PUT', `/api/users/${id}/sections`, { sections }),
};
