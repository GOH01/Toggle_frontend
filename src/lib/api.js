const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  || 'http://13.124.62.85/';
const API_REQUEST_BASE_URL = API_BASE_URL.replace(/\/+$/, '');

export async function apiRequest(path, options = {}) {
  const { headers = {}, body, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let response;

  try {
    response = await fetch(`${API_REQUEST_BASE_URL}${path}`, {
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body
        ? (isFormData ? body : JSON.stringify(body))
        : undefined,
      ...rest,
    });
  } catch {
    throw new Error('서버 연결에 실패했습니다. 백엔드 실행 상태와 CORS 설정을 확인해 주세요.');
  }

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const message = payload?.error?.message || '요청 처리 중 오류가 발생했습니다.';
    const error = new Error(message);
    error.status = response.status;
    error.code = payload?.error?.code || '';
    error.details = payload?.error || null;
    throw error;
  }

  return payload.data;
}

export { API_BASE_URL };
