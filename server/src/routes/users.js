import { Router } from 'express';

import { hashPassword, newSessionToken, sessionCookie, sessionExpiry } from '../auth.js';
import { publicUser } from '../access.js';
import { badRequest, conflict, notFound, requireRole, route, v } from '../http.js';

const ROLES = ['admin', 'teacher', 'parent'];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function userRoutes(store) {
  const r = Router();

  r.get(
    '/',
    requireRole('admin', 'teacher'),
    route(async (req, res) => {
      // Teachers only need the directory for names/avatars; parents get nothing.
      const users = await store.listUsers({ role: req.query?.role });
      res.json({ users: users.map(publicUser) });
    }),
  );

  r.post(
    '/',
    requireRole('admin'),
    route(async (req, res) => {
      const email = v.str(req.body?.email, 'email', { max: 200 }).toLowerCase();
      if (!EMAIL_RE.test(email)) throw badRequest('Enter a valid email address');
      if (await store.findUserByEmail(email)) throw conflict('That email is already in use');

      const password = v.str(req.body?.password, 'password', { max: 200 });
      if (password.length < 8) throw badRequest('Password must be at least 8 characters');

      const user = await store.createUser({
        email,
        password_hash: hashPassword(password),
        full_name: v.str(req.body?.full_name, 'full_name', { max: 120 }),
        role: v.oneOf(req.body?.role, 'role', ROLES),
        job_title: v.str(req.body?.job_title, 'job_title', { required: false, max: 80, fallback: null }),
        phone: v.str(req.body?.phone, 'phone', { required: false, max: 40, fallback: null }),
        is_active: v.bool(req.body?.is_active, true),
      });

      res.status(201).json({ user: publicUser(user) });
    }),
  );

  r.patch(
    '/:id',
    requireRole('admin'),
    route(async (req, res) => {
      const patch = {};
      if (req.body?.full_name !== undefined)
        patch.full_name = v.str(req.body.full_name, 'full_name', { max: 120 });
      if (req.body?.role !== undefined) {
        if (req.params.id === req.user.id) {
          throw badRequest('You cannot change your own role');
        }
        patch.role = v.oneOf(req.body.role, 'role', ROLES);
      }
      if (req.body?.job_title !== undefined)
        patch.job_title = v.str(req.body.job_title, 'job_title', {
          required: false,
          max: 80,
          fallback: null,
        });
      if (req.body?.phone !== undefined)
        patch.phone = v.str(req.body.phone, 'phone', { required: false, max: 40, fallback: null });
      if (req.body?.is_active !== undefined) patch.is_active = v.bool(req.body.is_active);
      if (req.body?.password) {
        const pw = v.str(req.body.password, 'password', { max: 200 });
        if (pw.length < 8) throw badRequest('Password must be at least 8 characters');
        patch.password_hash = hashPassword(pw);
      }
      if (!Object.keys(patch).length) throw badRequest('Nothing to update');

      if (req.params.id === req.user.id && patch.is_active === false) {
        throw badRequest('You cannot disable your own account');
      }

      const user = await store.updateUser(req.params.id, patch);
      if (patch.password_hash) await store.deleteSessionsForUser(user.id);
      res.json({ user: publicUser(user) });
    }),
  );

  r.delete(
    '/:id',
    requireRole('admin'),
    route(async (req, res) => {
      if (req.params.id === req.user.id) throw badRequest('You cannot delete your own account');
      if (!(await store.getUserById(req.params.id))) throw notFound('User not found');
      await store.deleteUser(req.params.id);
      res.json({ ok: true });
    }),
  );

  return r;
}

export function sessionRoutes(store) {
  const r = Router();

  /** Add another signed-in device, e.g. a tablet in the classroom. */
  r.post(
    '/',
    route(async (req, res) => {
      const token = newSessionToken();
      const expiresAt = sessionExpiry();
      await store.createSession(token, req.user.id, expiresAt);
      res.json({ url: `${req.protocol}://${req.get('host')}/?s=${token}` });
    }),
  );

  return r;
}
