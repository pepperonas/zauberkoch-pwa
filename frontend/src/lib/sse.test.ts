/**
 * SSE streaming client (lib/sse.ts) — the transport under every generation.
 * Covers: event dispatch to the right callbacks, buffering across chunk and
 * multi-byte boundaries, multi-`data:`-line accumulation, malformed/unknown
 * blocks, HTTP + network error mapping, and silent aborts.
 * Runs in the node env (Node ≥ 20 has ReadableStream/TextEncoder natively);
 * `fetch` is stubbed per test.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StreamCallbacks } from './sse';

vi.mock('./api', () => ({ getCsrfToken: () => 'csrf-123' }));

import { adaptRecipe, streamRecipe, tryRecipe } from './sse';

/** Response-shaped object whose body streams the given byte chunks. */
function sseResponse(chunks: Uint8Array[]): { ok: boolean; body: ReadableStream<Uint8Array> } {
  return {
    ok: true,
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(c);
        controller.close();
      },
    }),
  };
}

const enc = (s: string) => new TextEncoder().encode(s);

/** Callbacks that record every dispatch and resolve `finished` on done/error. */
function recorder() {
  const calls: Array<[string, unknown]> = [];
  let resolve!: () => void;
  const finished = new Promise<void>((r) => (resolve = r));
  const callbacks: StreamCallbacks = {
    onMeta: (p) => calls.push(['meta', p]),
    onZutat: (p) => calls.push(['zutat', p]),
    onSchritt: (p) => calls.push(['schritt', p]),
    onTipp: (p) => calls.push(['tipp', p]),
    onSaved: (p) => calls.push(['saved', p]),
    onDone: (p) => {
      calls.push(['done', p]);
      resolve();
    },
    onError: (p) => {
      calls.push(['error', p]);
      resolve();
    },
  };
  return { calls, callbacks, finished };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('streamSSE — happy path', () => {
  it('dispatches each semantic event to its callback with parsed JSON', async () => {
    const body =
      'event: meta\ndata: {"titel":"Pasta"}\n\n' +
      'event: zutat\ndata: {"name":"Spaghetti","menge":250}\n\n' +
      'event: schritt\ndata: {"nr":1,"text":"Kochen."}\n\n' +
      'event: tipp\ndata: "Wasser salzen."\n\n' +
      'event: saved\ndata: {"recipe_id":7,"cached":false,"remaining":4}\n\n' +
      'event: done\ndata: {"titel":"Pasta","portionen":2}\n\n';
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([enc(body)]));
    vi.stubGlobal('fetch', fetchMock);

    const { calls, callbacks, finished } = recorder();
    streamRecipe({ modus: 'kochen' } as never, callbacks);
    await finished;

    expect(calls).toEqual([
      ['meta', { titel: 'Pasta' }],
      ['zutat', { name: 'Spaghetti', menge: 250 }],
      ['schritt', { nr: 1, text: 'Kochen.' }],
      ['tipp', 'Wasser salzen.'],
      ['saved', { recipe_id: 7, cached: false, remaining: 4 }],
      ['done', { titel: 'Pasta', portionen: 2 }],
    ]);
  });

  it('POSTs JSON with the CSRF header to the generate endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([enc('event: done\ndata: {}\n\n')]));
    vi.stubGlobal('fetch', fetchMock);

    const { callbacks, finished } = recorder();
    streamRecipe({ modus: 'cocktail' } as never, callbacks);
    await finished;

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/recipes/generate');
    expect(init.method).toBe('POST');
    expect(init.headers['X-CSRF-Token']).toBe('csrf-123');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(init.body)).toEqual({ modus: 'cocktail' });
  });

  it('tryRecipe and adaptRecipe hit their own endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([enc('event: done\ndata: {}\n\n')]));
    vi.stubGlobal('fetch', fetchMock);

    const a = recorder();
    tryRecipe({ modus: 'kochen' } as never, a.callbacks);
    await a.finished;
    const b = recorder();
    adaptRecipe(42, 'schärfer', b.callbacks);
    await b.finished;

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/recipes/try');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/v1/recipes/42/adapt');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ anweisung: 'schärfer' });
  });
});

describe('streamSSE — buffering', () => {
  it('reassembles an event split across arbitrary chunk boundaries', async () => {
    const body = 'event: meta\ndata: {"titel":"Käsespätzle"}\n\nevent: done\ndata: {"ok":true}\n\n';
    const bytes = enc(body);
    // Split INSIDE the multi-byte "ä" of the payload: forces the TextDecoder
    // stream:true path AND the incomplete-block buffer in the same run.
    const umlautAt = body.indexOf('ä');
    const byteSplit = enc(body.slice(0, umlautAt)).length + 1;
    const chunks = [bytes.slice(0, byteSplit), bytes.slice(byteSplit, byteSplit + 9), bytes.slice(byteSplit + 9)];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(chunks)));

    const { calls, callbacks, finished } = recorder();
    streamRecipe({} as never, callbacks);
    await finished;

    expect(calls).toEqual([
      ['meta', { titel: 'Käsespätzle' }],
      ['done', { ok: true }],
    ]);
  });

  it('concatenates multiple data: lines of one event block', async () => {
    const body = 'event: meta\ndata: {"titel":\ndata: "Ramen"}\n\nevent: done\ndata: {}\n\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([enc(body)])));

    const { calls, callbacks, finished } = recorder();
    streamRecipe({} as never, callbacks);
    await finished;

    expect(calls[0]).toEqual(['meta', { titel: 'Ramen' }]);
  });

  it('ignores blocks without event or data and unknown event names', async () => {
    const body =
      ': keepalive comment\n\n' + // no event/data
      'data: {"orphan":true}\n\n' + // data without event
      'event: telemetry\ndata: {"x":1}\n\n' + // unknown event name
      'event: done\ndata: {"ok":true}\n\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([enc(body)])));

    const { calls, callbacks, finished } = recorder();
    streamRecipe({} as never, callbacks);
    await finished;

    expect(calls).toEqual([['done', { ok: true }]]);
  });
});

describe('streamSSE — errors and abort', () => {
  it('dispatches a server error event to onError', async () => {
    const body = 'event: error\ndata: {"code":"rate_limited","message":"Tageslimit erreicht"}\n\n';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([enc(body)])));

    const { calls, callbacks, finished } = recorder();
    streamRecipe({} as never, callbacks);
    await finished;

    expect(calls).toEqual([['error', { code: 'rate_limited', message: 'Tageslimit erreicht' }]]);
  });

  it('maps a non-ok JSON response to the server-provided error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        body: null,
        json: async () => ({ error: { code: 'unauthorized', message: 'Bitte einloggen' } }),
      }),
    );

    const { calls, callbacks, finished } = recorder();
    streamRecipe({} as never, callbacks);
    await finished;

    expect(calls).toEqual([['error', { code: 'unauthorized', message: 'Bitte einloggen' }]]);
  });

  it('falls back to stream_failed when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        body: null,
        json: async () => {
          throw new Error('not json');
        },
      }),
    );

    const { calls, callbacks, finished } = recorder();
    streamRecipe({} as never, callbacks);
    await finished;

    expect(calls[0][0]).toBe('error');
    expect((calls[0][1] as { code: string }).code).toBe('stream_failed');
  });

  it('maps a network failure to the network error code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { calls, callbacks, finished } = recorder();
    streamRecipe({} as never, callbacks);
    await finished;

    expect(calls).toEqual([['error', { code: 'network', message: 'Verbindung unterbrochen' }]]);
  });

  it('stays silent on abort — no error callback', async () => {
    // fetch that rejects with AbortError once the passed signal aborts
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }),
      ),
    );

    const { calls, callbacks } = recorder();
    const abort = streamRecipe({} as never, callbacks);
    abort();
    await flush();
    await flush();

    expect(calls).toEqual([]);
  });
});
