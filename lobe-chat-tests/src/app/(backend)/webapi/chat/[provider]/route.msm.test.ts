// @vitest-environment node
import { type LobeRuntimeAI, ModelRuntime } from '@lobechat/model-runtime';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/auth';
import { initModelRuntimeFromDB } from '@/server/modules/ModelRuntime';

vi.mock('@/app/(backend)/middleware/auth/utils', () => ({
  checkAuthMethod: vi.fn(),
}));

vi.mock('@/server/modules/ModelRuntime', () => ({
  initModelRuntimeFromDB: vi.fn(),
  createTraceOptions: vi.fn().mockReturnValue({}),
}));

vi.mock('@/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('../../_utils/workspace', () => ({
  resolveValidWorkspaceIdFromRequest: vi.fn().mockResolvedValue(undefined),
}));

import { maxDuration, POST } from './route';

describe('msm chat route', () => {
  let request: Request;

  beforeEach(() => {
    request = new Request(new URL('https://test.com'), {
      body: JSON.stringify({ model: 'test-model' }),
      method: 'POST',
    });

    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: {} as any,
      user: { id: 'test-user-id' } as any,
    });

    delete (globalThis as typeof globalThis & { __LOBE_UNDICI__?: unknown }).__LOBE_UNDICI__;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (globalThis as typeof globalThis & { __LOBE_UNDICI__?: unknown }).__LOBE_UNDICI__;
  });

  it('exports a 1-hour maxDuration', () => {
    expect(maxDuration).toBe(3600);
  });

  it('sets X-Lobe-Undici to 0 when undici is not installed on globalThis', async () => {
    const mockChatResponse = new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
    const mockRuntime: LobeRuntimeAI = {
      baseURL: 'abc',
      chat: vi.fn().mockResolvedValue(mockChatResponse),
    };
    vi.mocked(initModelRuntimeFromDB).mockResolvedValue(new ModelRuntime(mockRuntime));

    const response = await POST(request, {
      params: Promise.resolve({ provider: 'test-provider' }),
    });

    expect(response.headers.get('X-Lobe-Undici')).toBe('0');
  });

  it('sets X-Lobe-Undici to 1 when undici is installed on globalThis', async () => {
    (globalThis as typeof globalThis & { __LOBE_UNDICI__?: unknown }).__LOBE_UNDICI__ = {
      Agent: vi.fn(),
      fetch: vi.fn(),
    };

    const mockChatResponse = new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
    const mockRuntime: LobeRuntimeAI = {
      baseURL: 'abc',
      chat: vi.fn().mockResolvedValue(mockChatResponse),
    };
    vi.mocked(initModelRuntimeFromDB).mockResolvedValue(new ModelRuntime(mockRuntime));

    const response = await POST(request, {
      params: Promise.resolve({ provider: 'test-provider' }),
    });

    expect(response.headers.get('X-Lobe-Undici')).toBe('1');
  });
});
