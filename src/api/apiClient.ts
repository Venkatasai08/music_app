// Resilient API Client with Fast Timeout & Multi-Mirror Failover

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = 7000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const isFreefy = url.includes('freefy.app');

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        ...(isFreefy
          ? {
              Referer: 'https://freefy.app/',
              Origin: 'https://freefy.app',
            }
          : {}),
        ...(fetchOptions.headers || {}),
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchJsonWithFailover<T>(
  endpoints: string[],
  pathAndQuery: string,
  options: FetchOptions = {}
): Promise<T> {
  let lastError: any = null;

  for (const base of endpoints) {
    const fullUrl = `${base.replace(/\/$/, '')}/${pathAndQuery.replace(/^\//, '')}`;
    try {
      const res = await fetchWithTimeout(fullUrl, { timeoutMs: 3500, ...options });
      if (res.ok) {
        const data = await res.json();
        return data as T;
      }
      lastError = new Error(`HTTP ${res.status} from ${base}`);
    } catch (err) {
      lastError = err;
      // continue to next mirror immediately
    }
  }

  throw lastError || new Error(`All endpoints failed for ${pathAndQuery}`);
}
