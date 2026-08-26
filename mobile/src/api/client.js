import * as SecureStore from 'expo-secure-store';

// Falls back to the real live backend rather than localhost — `eas update`
// (unlike `eas build`) doesn't apply eas.json's per-profile env vars, and
// .env is gitignored so it's never present in a fresh download either. A
// build/update with no explicit override should still reach production,
// not a placeholder address nobody's actually running.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://empregoja-api.onrender.com';

const TOKEN_KEY = 'empregoja_token';

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token) {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, isFormData = false, auth = true } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(data?.error || 'Ocorreu um erro. Tente novamente.', res.status);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body, opts = {}) => request(path, { method: 'PATCH', body, ...opts }),
  del: (path) => request(path, { method: 'DELETE' }),
  postForm: (path, formData) => request(path, { method: 'POST', body: formData, isFormData: true }),
};

export { ApiError };
