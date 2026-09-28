import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { SESSION_COOKIE, parseCookies } from './auth.js';
import { HttpError } from './http.js';
import { authRoutes } from './routes/auth.js';
import { metaRoutes } from './routes/meta.js';
import { noteRoutes } from './routes/notes.js';
import { paymentRoutes } from './routes/payments.js';
import { studentRoutes } from './routes/students.js';
import { userRoutes } from './routes/users.js';
import { MemoryStore } from './store/memory.js';
import { SupabaseStore } from './store/supabase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Pointed at the file rather than relying on `dotenv/config`, which looks in
// the current working directory. This script is started from the repo root by
// `npm start` but the .env sits in server/, and a miss here would silently
// downgrade the app to an empty in-memory store instead of failing loudly.
// In production there is no .env file and the real environment is used.
dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = Number(process.env.PORT) || 4100;
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');

/** Supabase when configured, otherwise an in-memory store for local preview. */
async function createStore() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const store = new SupabaseStore(url, key);
    await store.init();
    console.log('  storage : Supabase (Postgres)');
    return store;
  }
  console.log('  storage : in-memory demo (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for cloud)');
  return new MemoryStore();
}

const store = await createStore();
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// In development the React dev server runs on a different port.
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: true, credentials: true }));
}

// ---- resolve the session cookie into req.user on every request ----
app.use(async (req, _res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE] ?? (req.query.s ? String(req.query.s) : null);
  req.sessionToken = token;
  req.user = null;
  if (token) {
    try {
      req.user = await store.getSessionUser(token);
    } catch {
      req.user = null;
    }
  }
  next();
});

app.get('/health', (_req, res) =>
  res.json({ ok: true, driver: store.driver, time: new Date().toISOString() }),
);

// ---- public ----
app.use('/api/auth', authRoutes(store));
app.use('/api/meta', (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Not signed in' }),
);
app.use('/api/meta', metaRoutes(store));

// ---- everything below needs a session ----
const authed = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Not signed in', code: 'UNAUTHENTICATED' });

app.use('/api/students', authed, studentRoutes(store));
app.use('/api/notes', authed, noteRoutes(store));
app.use('/api/payments', authed, paymentRoutes(store));
app.use('/api/users', authed, userRoutes(store));

// ---- serve the built React app ----
if (fs.existsSync(CLIENT_DIST)) {
  app.use(
    express.static(CLIENT_DIST, {
      /**
       * Vite fingerprints every filename under /assets, so those can be
       * cached forever. index.html must NOT be: after a deploy the browser
       * would keep the old shell, which points at asset files that the new
       * build no longer contains, and the app loads as a blank page.
       */
      setHeaders(res, filePath) {
        const isFingerprinted = filePath.includes(`${path.sep}assets${path.sep}`);
        res.setHeader(
          'Cache-Control',
          isFingerprinted ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    }),
  );
  app.get(/.*/, (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
} else {
  app.get('/', (_req, res) =>
    res
      .status(200)
      .type('html')
      .send('<p>Client not built yet. Run <code>npm run build</code> in client/, or use the Vite dev server.</p>'),
  );
}

// ---- error handler ----
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  // body-parser rejects unparseable / oversized payloads
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON in the request body', code: 'BAD_JSON' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large', code: 'TOO_LARGE' });
  }
  if (err?.code === '23505') {
    return res.status(409).json({ error: 'That record already exists', code: 'DUPLICATE' });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong on the server', code: 'INTERNAL' });
});

app.listen(PORT, () => {
  console.log(`\n  Brainy Bunch server  ->  http://localhost:${PORT}`);
  console.log(`  driver: ${store.driver}\n`);
});
