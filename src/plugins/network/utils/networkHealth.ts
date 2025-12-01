/**
 * Network Health Check Utilities
 * Utilities for checking the health of Mirror Node and RPC endpoints
 */
import axios from 'axios';

export async function checkMirrorNodeHealth(
  mirrorNodeUrl: string,
): Promise<{ status: string; code?: number }> {
  try {
    const testUrl = `${mirrorNodeUrl}/accounts/0.0.2`;
    const response = await axios.get(testUrl, { timeout: 3000 });
    return { status: '✅', code: response.status };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number } };
      if (axiosError.response.status === 404) {
        return { status: '✅', code: axiosError.response.status };
      }
      if (
        axiosError.response.status >= 400 &&
        axiosError.response.status < 500
      ) {
        return { status: '✅', code: axiosError.response.status };
      }
      return { status: '❌', code: axiosError.response.status };
    }
    return { status: '❌' };
  }
}

export async function checkRpcHealth(
  rpcUrl: string,
): Promise<{ status: string; code?: number }> {
  try {
    const response = await axios.post(
      rpcUrl,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'web3_clientVersion',
        params: [],
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 3000,
      },
    );
    return { status: '✅', code: response.status };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number } };
      return { status: '❌', code: axiosError.response.status };
    }
    return { status: '❌' };
  }
}
