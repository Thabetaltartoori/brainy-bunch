// The Express app, published as a Netlify Function.
//
// The .mjs extension is deliberate: it forces esbuild to emit ESM, which is
// required because server/src/index.js awaits the database connection at the
// top level. As .js the bundler would be free to choose CJS, and that build
// fails outright.
//
// The file name is still what names the function, so the route stays
// /.netlify/functions/api -- see the redirects in netlify.toml.
import serverless from 'serverless-http';

import { app } from '../../src/index.js';

export const handler = serverless(app);
