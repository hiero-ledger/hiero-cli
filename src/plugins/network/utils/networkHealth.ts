/**
 * Network Health Check Utilities
 * Utilities for checking the health of Mirror Node and RPC endpoints
 */

const HEALTH_CHECK_TIMEOUT_MS = 3000;

async function fetchWithTimeout(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    HEALTH_CHECK_TIMEOUT_MS,
  );
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function checkMirrorNodeHealth(
  mirrorNodeUrl: string,
): Promise<{ status: string; code?: number }> {
  try {
    const testUrl = `${mirrorNodeUrl}/accounts/0.0.2`;
    const response = await fetchWithTimeout(testUrl);

    const code = response.status;
    if (response.ok || (code >= 400 && code < 500)) {
      return { status: '✅', code };
    }
    return { status: '❌', code };
  } catch {
    return { status: '❌' };
  }
}

export async function checkRpcHealth(
  rpcUrl: string,
): Promise<{ status: string; code?: number }> {
  try {
    const response = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'web3_clientVersion',
        params: [],
      }),
    });

    if (!response.ok) {
      return { status: '❌', code: response.status };
    }
    return { status: '✅', code: response.status };
  } catch {
    return { status: '❌' };
  }
}
