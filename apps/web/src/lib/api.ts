import type { Room } from '@segue/shared';

export interface Joined {
  roomCode: string;
  playerId: string;
  token: string;
}

export interface RoomResponse {
  room: Room;
  joined?: Joined;
}

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiFail {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResult<T> = ApiOk<T> | ApiFail;

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: options.method ?? 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: { message?: string; code?: string } | string;
    } & T;
    if (!res.ok || data.ok === false) {
      const err = data.error;
      const message = typeof err === 'string' ? err : (err?.message ?? 'Erro inesperado.');
      const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code?: string }).code : undefined;
      return { ok: false, error: message, code };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Sem conexão com o servidor.' };
  }
}
