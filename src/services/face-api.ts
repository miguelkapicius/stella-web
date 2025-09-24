export type EnrollPayload = {
  name: string;
  role?: string;
  embedding: number[];
};

export type AuthPayload = {
  embedding: number[];
};

export type ApiResponse<T = any> = {
  ok: boolean;
  data?: T;
  error?: string;
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function postJson<T>(path: string, body: any): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${path}`.replace(/\/$/, ''), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json() : undefined;

    if (!res.ok) {
      return { ok: false, error: payload?.error || `HTTP ${res.status}` };
    }

    return { ok: true, data: payload };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Network error' };
  }
}

export function enrollFace(payload: EnrollPayload) {
  console.log(payload);
  return postJson('/enroll', payload);
}

export function authenticateFace(payload: AuthPayload) {
  console.log(payload);
  return postJson('/authenticate', payload);
}
