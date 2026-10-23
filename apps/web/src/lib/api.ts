import { cache } from 'react';

const API_BASE =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000/api/v1';

async function fetchApiRaw<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; status?: number; [key: string]: any }> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let authHeader: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('biz_auth_token');
      if (token) {
        authHeader = { Authorization: `Bearer ${token}` };
      }
    } catch {}
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        message: data.message || `Request failed with status ${res.status}`,
        status: res.status,
        ...data,
      };
    }

    return data;
  } catch (err: any) {
    console.error(`Fetch API Error for ${url}:`, err.message);
    return {
      success: false,
      message: 'Unable to connect to BizListPlace.com directory service.',
    };
  }
}

export const fetchApi = cache(fetchApiRaw);

