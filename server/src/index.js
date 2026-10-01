import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { SESSION_COOKIE, parseCookies } from './auth.js';
import { HttpError } from './http.js';
import { authRoutes } from './routes/auth.js';
import { assessmentRoutes } from './routes/assessments.js';
import { metaRoutes } from './routes/meta.js';
import { noteRoutes } from './routes/notes.js';
import { paymentRoutes } from './routes/payments.js';
import { studentRoutes } from './routes/students.js';
import { userRoutes } from './routes/users.js';
import { MemoryStore } from './store/memory.js';
import { SupabaseStore } from './store/supabase.js';

/**
 * Where this file lives, worked out in a way that survives either module
 * format.
 *
 * A serverless runtime may bundle this as CommonJS, and esbuild empties
 * `import.meta` when it does, so reading `import.meta.url` unguarded would
 * throw while the module loads. The fallback only ever affects the two paths
 * below, and neither is used under a function: there is no .env to read, and
 * the static build is served by the CDN rather than from disk.
 */
const HERE = (() => {
  const url = import.meta?.url;
  return url ? path.dirname(fileURLToPath(url)) : process.cwd();
})();

// Pointed at the file rather than relying on `dotenv/config`, which looks in
// the current working directory. This script is started from the repo root by
// `npm start` but the .env sits in server/, and a miss here would silently
// downgrade the app to an empty in-memory store instead of failing loudly.
// In production there is no .env file and the real environment is used.
dotenv.config({ path: path.join(HERE, '..', '.env'), quiet: true });

const ROOT = path.resolve(HERE, '..', '..');
const PORT = Number(process.env.PORT) || 4100;
const CLIENT_DIST = path.join(ROOT, 'client', 'dist');

/**
 * True under Cloudflare Workers.
 *
 * Workers has no filesystem, so the built client is uploaded as static assets
 * and answered by Cloudflare's own asset router (see the [assets] block in
 * wrangler.toml) rather than by express.static here. It also has no port to
 * bind: worker/index.js passes the app to httpServerHandler instead of this
 * file listening for itself.
 *
 * The test is the runtime's own user agent, which is the documented way to tell
 * the Workers runtime from Node. A plain `globalThis.navigator` check is not
 * usable here: modern Node has a navigator global too, so it would report true
 * on your machine and silently stop serving client/dist during local testing.
 */
const ON_CLOUDFLARE = globalThis.navigator?.userAgent === 'Cloudflare-Workers';

/** Supabase when configured, otherwise an in-memory store for local preview. */
function createStore() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    const store = new SupabaseStore(url, key);
    /**
     * A reachability check, deliberately not awaited.
     *
     * It used to be awaited so a bad project URL stopped the process at once.
     * Awaiting it here instead meant this module had a top-level await, which
     * esbuild cannot emit when it bundles for a serverless runtime, and the
     * deploy quietly fell back to shipping a zip. The store is fully usable
     * the moment the constructor returns, so the check is now a log line and
     * nothing more: a wrong URL still reports itself, it just does not stop
     * the server from starting.
     */
    store.init().catch((err) => {
      console.error(`  storage : Supabase unreachable - ${err.message}`);
    });
    console.log('  storage : Supabase (Postgres)');
    return store;
  }
  console.log('  storage : in-memory demo (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for cloud)');
  return new MemoryStore();
}

const store = createStore();
export const app = express();

if (process.env.NETLIFY === 'true') {
  app.use((req, _res, next) => {
    const functionPrefix = '/.netlify/functions/api';
    if (req.url.startsWith(functionPrefix)) {
      req.url = req.url.slice(functionPrefix.length) || '/';
    }
    next();
  });
}

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
app.use('/api/assessments', authed, assessmentRoutes(store));
app.use('/api/notes', authed, noteRoutes(store));
app.use('/api/payments', authed, paymentRoutes(store));
app.use('/api/users', authed, userRoutes(store));

// ---- serve the built React app ----
// Skipped on Workers: there is no filesystem to read client/dist from, and the
// asset router in wrangler.toml has already answered the request. The catch-all
// below is included in that skip for the same reason - on Workers, index.html
// comes from the SPA fallback in the asset router.
if (!ON_CLOUDFLARE && fs.existsSync(CLIENT_DIST)) {
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

// Under a Netlify function or on Workers there is no port to bind, and calling
// listen() there would stop the instance ever responding: worker/index.js hands
// the app to httpServerHandler, and the Netlify function wraps it in
// serverless-http. Both are driven by the request, not by this file.
if (!ON_CLOUDFLARE && process.env.NETLIFY !== 'true') {
  app.listen(PORT, () => {
    console.log(`\n  Brainy Bunch server  ->  http://localhost:${PORT}`);
    console.log(`  driver: ${store.driver}\n`);
  });
}
