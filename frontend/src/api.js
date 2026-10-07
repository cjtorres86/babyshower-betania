import { API_URL } from './config';

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.'), { status: 0 });
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Algo salió mal. Intenta de nuevo.'), { status: res.status });
  return data;
}

export const api = {
  listGifts: () => request('/api/gifts'),
  reserve: (id, name, note) => request(`/api/gifts/${id}/reserve`, { method: 'POST', body: { name, note } }),
  login: (password) => request('/api/admin/login', { method: 'POST', body: { password } }),
  createGift: (token, gift) => request('/api/admin/gifts', { method: 'POST', body: gift, token }),
  updateGift: (token, id, gift) => request(`/api/admin/gifts/${id}`, { method: 'PUT', body: gift, token }),
  releaseGift: (token, id) => request(`/api/admin/gifts/${id}/release`, { method: 'POST', token }),
  deleteGift: (token, id) => request(`/api/admin/gifts/${id}`, { method: 'DELETE', token }),
};
