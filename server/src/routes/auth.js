import { Router } from 'express';

import { clearCookie, newSessionToken, sessionCookie, sessionExpiry, verifyPassword } from '../auth.js';
import { publicUser } from '../access.js';
import { HttpError, route, v } from '../http.js';

export function authRoutes(store) {
  const r = Router();

  r.post(
    '/login',
    route(async (req, res) => {
      const email = v.str(req.body?.email, 'email', { max: 200 });
      const password = v.str(req.body?.password, 'password', { max: 200 });

      const user = await store.findUserByEmail(email);

      // Always run a hash comparison so a missing account and a wrong
      // password take the same time — no user enumeration.
      const stored = user?.password_hash ?? 'scrypt$16384$8$1$00$00';
      const ok = verifyPassword(password, stored);

      if (!user || !ok) throw new HttpError(401, 'Wrong email or password', 'BAD_CREDENTIALS');
      if (!user.is_active) throw new HttpError(403, 'This account has been disabled', 'DISABLED');

      const token = newSessionToken();
      const expiresAt = sessionExpiry();
      await store.createSession(token, user.id, expiresAt);

      res.setHeader('Set-Cookie', sessionCookie(token, expiresAt));
      res.json({ user: publicUser(user) });
    }),
  );

  r.post(
    '/logout',
    route(async (req, res) => {
      if (req.sessionToken) await store.deleteSession(req.sessionToken);
      res.setHeader('Set-Cookie', clearCookie());
      res.json({ ok: true });
    }),
  );

  r.get(
    '/me',
    route(async (req, res) => {
      res.json({ user: publicUser(req.user) });
    }),
  );

  return r;
}
