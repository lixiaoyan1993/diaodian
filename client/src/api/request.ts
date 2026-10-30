const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export type ApiError = Error & {
  code?: number;
  data?: unknown;
  statusCode?: number;
};

function createApiError(message: string, extras: Partial<ApiError> = {}) {
  const error = new Error(message) as ApiError;
  Object.assign(error, extras);
  return error;
}

function getToken(): string | null {
  try {
    return uni.getStorageSync('token') || null;
  } catch {
    return null;
  }
}

function normalizeNetworkError(message: string) {
  if (message.includes('url not in domain list')) {
    return '后端接口不在微信 request 合法域名里，请在小程序后台配置服务器域名';
  }
  if (message.includes('request:fail')) {
    return '网络请求失败，请检查后端服务和小程序域名配置';
  }
  return message || '网络错误';
}

async function request<T>(
  method: string,
  url: string,
  data?: unknown,
): Promise<ApiResponse<T>> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method: method as any,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      success: (res) => {
        const body = res.data as ApiResponse<T>;

        if (res.statusCode === 401) {
          uni.removeStorageSync('token');
          uni.removeStorageSync('user');
          uni.navigateTo({ url: '/pages/login/login' });
          reject(createApiError(body?.message || '登录已过期', {
            code: 401,
            statusCode: 401,
            data: body?.data,
          }));
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(createApiError(body?.message || `请求失败 ${res.statusCode}`, {
            code: body?.code,
            statusCode: res.statusCode,
            data: body?.data,
          }));
          return;
        }

        if (!body || typeof body !== 'object' || typeof body.code !== 'number') {
          reject(createApiError('接口返回格式异常，请检查后端服务或 /api 代理'));
          return;
        }

        if (body.code !== 0) {
          reject(createApiError(body.message || '请求失败', {
            code: body.code,
            statusCode: res.statusCode,
            data: body.data,
          }));
          return;
        }

        resolve(body);
      },
      fail: (err) => {
        reject(createApiError(normalizeNetworkError(err.errMsg || '网络错误')));
      },
    });
  });
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, data?: unknown) => request<T>('POST', url, data),
  put: <T>(url: string, data?: unknown) => request<T>('PUT', url, data),
  del: <T>(url: string) => request<T>('DELETE', url),
};
