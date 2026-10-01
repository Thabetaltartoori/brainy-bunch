// The Express app, published as a Cloudflare Worker.
//
// The same app object that server/src/index.js hands to app.listen() locally is
// wrapped in a node:http server here and exported as a fetch handler. Without
// this entry point the Worker had no handler at all: every /api/* request died
// at the network level, the browser's fetch() rejected, and the login screen
// reported "Cannot reach the server" - which looks like a network problem but is
// really a missing request handler.
//
// Static files are NOT served here. client/dist is uploaded as static assets
// (see wrangler.toml) and Cloudflare answers those requests from its own asset
// router, which is why /api/* is listed under run_worker_first: everything else
// still has to reach the index.html fallback for client-side routing to work.

import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';

import { app } from '../server/src/index.js';

export default httpServerHandler(createServer(app));