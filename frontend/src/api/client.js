const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || __API_BASE_URL__ || '';

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || '요청을 처리하지 못했습니다.');
  }

  return data;
}

export function getProducts(params) {
  return apiRequest(`/products?${params.toString()}`);
}

export function getArticles(params) {
  return apiRequest(`/articles?${params.toString()}`);
}

export function createProduct(payload) {
  return apiRequest('/products', {
    method: 'POST',
    body: payload,
  });
}

export function createArticle(payload) {
  return apiRequest('/articles', {
    method: 'POST',
    body: payload,
  });
}

export function signIn(payload) {
  return apiRequest('/auth/signIn', {
    method: 'POST',
    body: payload,
  });
}

export function signUp(payload) {
  return apiRequest('/auth/signUp', {
    method: 'POST',
    body: payload,
  });
}

export function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  return apiRequest('/images/upload', {
    method: 'POST',
    body: formData,
  });
}
