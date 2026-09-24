import { expect, test } from '@playwright/test';

import { OpenAIStub } from '../../support/openAIStub.js';

const enabled = process.env.MSM_PROVIDER_INTEGRATION === '1';
const stub = new OpenAIStub();

const chatPayload = (model: string, overrides: Record<string, unknown> = {}) => ({
  messages: [{ content: 'MSM integration prompt', role: 'user' }],
  model,
  stream: true,
  temperature: 0,
  ...overrides,
});

test.describe('patched OpenAI boundary', () => {
  test.skip(!enabled, 'set MSM_PROVIDER_INTEGRATION=1 and point OPENAI_PROXY_URL at the stub');

  test.beforeAll(async () => {
    await stub.start();
  });

  test.afterAll(async () => {
    await stub.stop();
  });

  test.beforeEach(() => {
    stub.reset();
  });

  test('uses the Responses non-stream path and preserves rich output', async ({ request }) => {
    stub.reset('rich');

    const response = await request.post('/webapi/chat/openai', {
      data: chatPayload('gpt-5', {
        reasoning: { effort: 'medium', summary: 'auto' },
        tools: [
          {
            function: {
              description: 'MSM lookup',
              name: 'lookup',
              parameters: { properties: {}, type: 'object' },
            },
            type: 'function',
          },
        ],
      }),
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    expect(response.headers()['x-lobe-undici']).toBe('1');

    const body = await response.text();
    expect(body).toContain('MSM provider response');
    expect(body).toContain('MSM reasoning');
    expect(body).toContain('example.com/msm');
    expect(body).toContain('lookup');

    expect(stub.requests).toHaveLength(1);
    expect(stub.requests[0].path).toBe('/v1/responses');
    expect(stub.requests[0].body.stream).not.toBe(true);
    expect(stub.requests[0].body.reasoning).toEqual(
      expect.not.objectContaining({ summary: 'auto' }),
    );
  });

  test('does not retry a transient upstream failure', async ({ request }) => {
    stub.reset('failure');

    const response = await request.post('/webapi/chat/openai', {
      data: chatPayload('gpt-4o'),
    });

    expect(response.ok()).toBeFalsy();
    expect(stub.requests).toHaveLength(1);
  });

  test('does not add date, model, locale, or unwanted tools to the provider payload', async ({
    request,
  }) => {
    const response = await request.post('/webapi/chat/openai', {
      data: chatPayload('gpt-4o'),
    });

    expect(response.ok(), await response.text()).toBeTruthy();
    expect(stub.requests).toHaveLength(1);

    const payload = JSON.stringify(stub.requests[0].body);
    expect(payload).not.toMatch(/preferred reply language/i);
    expect(payload).not.toMatch(/current date/i);
    expect(payload).not.toMatch(/current model/i);
    expect(payload).not.toContain('lobe-image-generation');
  });
});
