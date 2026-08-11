/**
 * Backend API client.
 * Backend: POST /upload-csv (multipart file) → analysis JSON
 */
function apiUrl(path) {
  const base = (CONFIG.API_BASE_URL || '').replace(/\/$/, '');
  if (!base) {
    throw new Error(
      'Analysis API is not configured for this deployment. Set PRODUCTION_API_BASE_URL in js/config.js to your hosted FastAPI URL.'
    );
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function uploadCsv(file) {
  const form = new FormData();
  form.append('file', file);

  let res;
  try {
    res = await fetch(apiUrl('/upload-csv'), {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error(
      'Could not reach the analysis server. Make sure the API is running and reachable from this site.'
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = data.detail || res.statusText || 'Upload failed';
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  return data;
}

async function healthCheck() {
  let res;
  try {
    res = await fetch(apiUrl('/'));
  } catch {
    throw new Error('Could not reach the analysis server.');
  }
  if (!res.ok) throw new Error('API health check failed');
  return res.json();
}

window.API = { uploadCsv, healthCheck };
