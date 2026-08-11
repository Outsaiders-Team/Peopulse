/**
 * App config.
 * Local: talks to the FastAPI process from ./run (port 8000).
 * Production (Vercel): set PRODUCTION_API_BASE_URL to your hosted API origin
 * (no trailing slash), e.g. https://peopulse-api.onrender.com
 */
const PRODUCTION_API_BASE_URL = '';

function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

const CONFIG = {
  API_BASE_URL: isLocalHost(window.location.hostname)
    ? 'http://127.0.0.1:8000'
    : PRODUCTION_API_BASE_URL.replace(/\/$/, ''),
};

window.CONFIG = CONFIG;
