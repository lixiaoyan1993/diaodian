interface UploadResult {
  url: string;
}

function pickApiHost() {
  const envBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  if (envBase) return envBase;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

function normalizeUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = pickApiHost();
  return `${base}${url}`;
}

export const uploadApi = {
  image: async (filePath: string) => {
    const token = uni.getStorageSync('token');
    const base = pickApiHost();
    const uploadUrl = `${base}/api/upload/image`;
    const result = await new Promise<{ data: UploadResult }>((resolve, reject) => {
      uni.uploadFile({
        url: uploadUrl,
        name: 'file',
        filePath,
        header: token ? { Authorization: `Bearer ${token}` } : undefined,
        success: (res) => {
          try {
            const body = JSON.parse(res.data || '{}');
            if (res.statusCode < 200 || res.statusCode >= 300 || body.code !== 0 || !body.data?.url) {
              console.error('[upload] request failed', {
                statusCode: res.statusCode,
                body,
                uploadUrl,
              });
              reject(new Error(body.message || `图片上传失败（HTTP ${res.statusCode}）`));
              return;
            }
            resolve({ data: { url: normalizeUrl(String(body.data.url)) } });
          } catch (error) {
            console.error('[upload] invalid response', {
              statusCode: res.statusCode,
              raw: res.data,
              uploadUrl,
              error,
            });
            reject(new Error('上传返回格式异常'));
          }
        },
        fail: (err) => {
          console.error('[upload] network failed', {
            err,
            uploadUrl,
          });
          reject(new Error(err.errMsg || '上传失败'));
        },
      });
    });
    return result;
  },
};
