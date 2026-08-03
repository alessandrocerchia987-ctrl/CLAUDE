const { AsyncLocalStorage } = require('node:async_hooks');

const als = new AsyncLocalStorage();

// Wraps every request so absoluteUrl() can build photo/upload URLs using
// whatever host the client actually used to reach the server — LAN IP,
// localhost, or the public Render domain — instead of a PUBLIC_BASE_URL
// env var that's easy to forget to update when the network changes.
function withRequestContext(req, res, next) {
  als.run({ baseUrl: `${req.protocol}://${req.get('host')}` }, next);
}

function getBaseUrl() {
  return als.getStore()?.baseUrl || process.env.PUBLIC_BASE_URL || 'http://localhost:4000';
}

module.exports = { withRequestContext, getBaseUrl };
