# Brainy Bunch — School Management System

نظام إدارة مدرسة **برايني بانش** — توصيات المعلمين لأولياء الأمور، ومتابعة الرسوم الشهرية.

A full-stack school system for **Brainy Bunch**: teacher notes/recommendations that parents
can read, monthly tuition tracking, and role-based accounts. Arabic + English, green with
red reserved for money and attention states.

---

## ✨ What it does

| | |
|---|---|
| 👩‍🏫 **Teacher notes** | Teachers write **recommendations**, **praise** or **needs-attention** notes. Each note is either **shared with parents** or kept **internal**. |
| 👨‍👩‍👧 **Parent portal** | A parent signs in with the same login and sees **only their own child** — notes, payments, balance. Nothing else. |
| 💳 **Monthly tuition** | One payment row per student per month. Tracks paid / partial / unpaid, arrears, and the running balance. |
| 🟢🔴 **Clear status** | Green = settled. Amber = part paid. Red = unpaid or overdue. Never ambiguous. |
| 🌐 **Arabic + English** | Full RTL support. One toggle, and the whole interface — including numbers and dates — switches. |
| ✨ **Dynamic top label** | A rotating banner at the top of every page: announcements, live fee figures, today's date. Urgent messages turn the bar red. |
| 🔐 **Three roles** | `admin` (everything), `teacher` (own students only), `parent` (own children only). Enforced **on the server**, not just hidden in the UI. |

## 🛠️ Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + React Router + Vite, plain CSS with design tokens |
| Backend | Node.js + Express, no framework magic |
| Database | Supabase (Postgres) — or an in-memory store for instant preview |
| Security | scrypt password hashing, HttpOnly `SameSite=Strict` session cookies, role checks on every route |

---

## 🚀 Getting started

Requires **Node.js 20 or newer**.

```bash
# 1. install
cd server && npm install
cd ../client && npm install

# 2. run both (two terminals)
cd server && npm run dev     # API  -> http://localhost:4100
cd client && npm run dev     # app  -> http://localhost:5173
```

Open **http://localhost:5173** and sign in with a demo account below.

> The app starts on **port 4100** for the API. If something already uses it, set `PORT`
> in `server/.env` and update the proxy in `client/vite.config.js` to match.

### To run it as one app (production)

From the repository root:

```bash
npm run build     # installs both packages and builds the client into client/dist
npm start         # Express serves the API *and* the app on one port
```

Then open **http://localhost:4100** (`PORT=4200` to use a different port).

The session cookie is set with `Secure` whenever `NODE_ENV=production`, so local
production testing needs real HTTPS or the browser will discard the cookie.

---

## 🌐 Deploying to Render

The app is one Node service: Express serves the API and the built client from a
single origin, so there is no CORS setup and no separate static host.
`render.yaml` is a ready blueprint.

1. Push the repo to GitHub.
2. At **render.com/blueprint**, connect the repository and apply the blueprint.
3. Fill in the two prompted values:
   - `SUPABASE_URL` — from Supabase → Project Settings → API Keys
   - `SUPABASE_SERVICE_ROLE_KEY` — the `sb_secret_...` key, same page
4. Deploy. The first build takes a few minutes.

Render runs `npm run build` and `npm start`, uses `/health` for its health
check, and serves the result over HTTPS.

> ⚠️ Never put `SUPABASE_SERVICE_ROLE_KEY` anywhere that reaches the browser —
> not in Netlify/Vercel build variables, not in `VITE_*` variables, not in a
> committed file. It bypasses row-level security. It belongs only in the
> server's environment.

The free tier sleeps after inactivity, so the first request after a pause takes
roughly 30 seconds while the service wakes.

---

## 🌐 Deploying to Cloudflare Workers

`wrangler.toml` is a ready configuration. The Express app runs on the Workers
runtime through `node:http`'s `httpServerHandler` (see `worker/index.js`), and the
React build is uploaded as **static assets** rather than served by
`express.static` — Workers has no filesystem to read it from.

That split is why the login screen used to report "Cannot reach the server":
without `worker/index.js` there was no request handler at all, so every
`/api/*` call died before it reached Express. A failed `fetch()` is what the
client reports as `OFFLINE`, which reads like a network fault but is really a
missing handler.

1. Build and deploy:

   ```bash
   npm run cf:deploy
   ```

2. Set the two Supabase values as secrets — **not** in `wrangler.toml`:

   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```

   Deploy again so the Worker picks them up. The startup log must say
   `storage : Supabase (Postgres)`; `in-memory demo` means the app is running on
   throwaway data.

3. Confirm it works: `https://brainy-bunch.<your-subdomain>.workers.dev/health`
   should return `{"ok":true,...}`.

### Attaching a custom domain

1. Add the domain to Cloudflare and point its nameservers at Cloudflare.
2. Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**.
3. Add the same hostname to `wrangler.toml` under `[[routes]]` with
   `custom_domain = true`, so a later deploy does not drop it.

### With Workers Builds (Git-connected deploys)

Set **Build command** to `npm run build` and **Deploy command** to
`npx wrangler deploy`. The build must run first because `client/dist` is
gitignored, and the deploy uploads it as the assets directory.

---

## 🔑 Demo accounts

The in-memory demo store creates these automatically. **Demo data resets whenever the
server restarts.**

| Role | Email | Password |
|---|---|---|
| Director (admin) | `admin@brainybunch.school` | `Admin#2026` |
| Teacher (Mathematics) | `amina@brainybunch.school` | `Teach#2026` |
| Parent (2 children) | `parent@brainybunch.school` | `Parent#2026` |

> ⚠️ Change every password before real use.

---

## ☁️ Connecting Supabase (real, permanent data)

The default in-memory store is only for preview. For data that survives restarts:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste in [`server/sql/schema.sql`](server/sql/schema.sql) and run it. This creates all 8 tables and then locks them down with Row Level Security.
3. Go to **Project Settings → API Keys** and copy the project URL and your **secret** key (`sb_secret_...` on new projects; the long `eyJ...` `service_role` key on older ones). Take the secret key, not the publishable one.
4. Copy `server/.env.example` to `server/.env` and fill them in:

   ```ini
   SUPABASE_URL=https://yourproject.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
   ```

5. Upload the demo data so the cloud database is not empty:

   ```bash
   cd server && npm run seed:cloud
   ```

   It inserts the 6 accounts, 6 students, teacher/guardian links, notes, payment
   history and banner messages. Already-populated tables are left alone; re-run with
   `npm run seed:cloud -- --force` to wipe and replace them.

6. Restart the server. The startup line confirms which store is live:

   ```
   storage : Supabase (Postgres)     <- real data
   storage : in-memory demo          <- preview only
   ```

### Adding your own students

The seed data only exists in the in-memory demo. With Supabase connected, create your
first real account in the app (**Staff → Add account**, role *Director*), then use it to
add students. If you would rather import your existing list, insert rows into `students`
directly in the Supabase table editor, then link each student to a teacher in
`teacher_students` and a parent in `guardians`.

---

## 🔐 How the permissions work

This is the part that matters most in a school, so it is enforced in one place —
`server/src/access.js` — and checked on **every** route:

| Role | Can see students | Can write notes | Can record payments | Can manage users |
|---|---|---|---|---|
| `admin` | all | yes | yes | yes |
| `teacher` | students in their assigned **sections**, plus any linked in `teacher_students` | own students, own notes | no | no |
| `parent` | only children in `guardians`, **shared notes only** | no | no | no |

A teacher who is not assigned to a student gets `403` — verified in the test script below.

### Teacher sections

A teacher can be given whole classes at once instead of linking students one by
one. In **Staff → edit a teacher**, tick the sections they cover; the list is
built from the classes that actually have students in them.

Sections need one table, created by `server/sql/002-teacher-sections.sql`. Until
that is applied the server logs a warning and falls back to the individual
links, so nothing breaks in the meantime.

---

## 📁 Structure

```
الروضة/            <- this folder
├── server/
│   ├── sql/schema.sql          # the 8 tables, run once in Supabase
│   └── src/
│       ├── index.js            # Express app, sessions, static hosting
│       ├── access.js           # WHO can see WHAT — the single gate
│       ├── fees.js             # tuition math (pure functions, no I/O)
│       ├── auth.js             # scrypt hashing + session cookies
│       ├── http.js             # error types + input validation
│       ├── routes/             # auth, students, notes, payments, users, meta
│       └── store/
│           ├── supabase.js     # Postgres driver
│           ├── memory.js       # in-memory driver (same interface)
│           └── seed.js         # demo data, dates relative to today
└── client/
    └── src/
        ├── App.jsx             # routing + session
        ├── i18n.jsx            # Arabic + English strings
        ├── styles.css          # design tokens, animations, RTL
        ├── format.js           # money / date / period formatting
        ├── api.js              # fetch wrapper
        ├── components/         # Shell (nav + ticker), ui.jsx primitives
        └── pages/              # Login, Dashboard, Students, StudentProfile,
                                # Payments, Notes, Staff, Announcements
```

## 🎨 Design

- **Colour** — deep green base (`#0E6E49`), with red (`#C93A31`) used *only* for money due
  and things needing attention. Amber marks part-paid. Nothing else is red.
- **Buttons** — gradient fill with a light sweep across the surface on hover, a 2px lift,
  and a soft press. The sheen also animates slowly on the logo.
- **Top label** — messages rotate every ~5s, sliding up and out with a pulse dot; urgent
  announcements recolour the whole bar.
- **RTL** — every size uses CSS logical properties, so Arabic and English share one
  stylesheet. Icon direction flips for RTL.
- **Reduced motion** — all animation is disabled for users who ask for it.

## 🛡️ Notes on security

- Passwords are hashed with **scrypt** and a per-user salt; the hash never leaves the server.
- Sessions are opaque random tokens in an **HttpOnly, SameSite=Strict** cookie. No JWT in
  `localStorage`, so a cross-site script cannot read them.
- Login runs a hash comparison even for unknown emails, so response timing does not reveal
  which accounts exist.
- The Supabase `service_role` key is server-only. It is read from `.env` and never bundled
  into the client.
- Every table has Row Level Security enabled and the `anon` / `authenticated` grants
  revoked, so the tables are unreachable through the public Data API. The server's secret
  key carries `BYPASSRLS`; **all** real authorisation lives in `src/access.js`.
- Notes marked *not shared* are filtered out of every parent-facing response, not just hidden
  in the interface.

## 🧪 Checking it works

With the server running:

```powershell
# health
curl http://localhost:4100/health

# wrong password must be 401
curl -o NUL -w "%{http_code}" -X POST http://localhost:4100/api/auth/login `
  -H "Content-Type: application/json" -d '{\"email\":\"admin@brainybunch.school\",\"password\":\"nope\"}'

# sign in, then read as each role
curl -c jar.txt -X POST http://localhost:4100/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"parent@brainybunch.school\",\"password\":\"Parent#2026\"}'
curl -b jar.txt http://localhost:4100/api/students   # only this parent's children
```
