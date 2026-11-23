import type { Page } from '@playwright/test';

export interface CapturedChatRequest {
  body: Record<string, unknown>;
  url: string;
}

const createLobeSSEChunks = (content: string) => {
  const id = 'msg_msm_behavior';
  const data = {
    content: [],
    id,
    model: 'gpt-4o-mini',
    role: 'assistant',
    stop_reason: null,
    type: 'message',
    usage: { input_tokens: 12_345, output_tokens: 98_765 },
  };
  const usage = {
    inputCacheMissTokens: 12_345,
    inputCachedTokens: 0,
    totalInputTokens: 12_345,
    totalOutputTokens: 98_765,
    totalTokens: 111_110,
  };

  return [
    `id: ${id}\nevent: data\ndata: ${JSON.stringify(data)}\n\n`,
    `id: ${id}\nevent: text\ndata: ${JSON.stringify(content)}\n\n`,
    `id: ${id}\nevent: stop\ndata: "end_turn"\n\n`,
    `id: ${id}\nevent: usage\ndata: ${JSON.stringify(usage)}\n\n`,
    `id: ${id}\nevent: stop\ndata: "message_stop"\n\n`,
  ];
};

export class BrowserChatMock {
  readonly requests: CapturedChatRequest[] = [];

  constructor(
    private readonly content = 'MSM deterministic assistant response',
    private readonly finalDelayMs = 20,
  ) {}

  async install(page: Page) {
    await page.exposeFunction('__msmCreateChatPlan', (url: string, rawBody: string) => {
      let body: Record<string, unknown> = {};
      try {
        body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
      } catch {
        // Keep malformed requests visible to assertions without hiding them.
      }

      this.requests.push({ body, url });
      return {
        chunks: createLobeSSEChunks(this.content),
        finalDelayMs: this.finalDelayMs,
      };
    });

    await page.addInitScript({
      content: `
        (() => {
          if (window.__msmChatMockInstalled) {
            return;
          }
          const originalFetch = window.fetch.bind(window);
          const abortError = () => new DOMException('The operation was aborted', 'AbortError');
          const wait = (delay, signal) =>
            new Promise((resolve, reject) => {
              if (signal.aborted) {
                return reject(signal.reason || abortError());
              }
              const timeout = window.setTimeout(resolve, delay);
              signal.addEventListener(
                'abort',
                () => {
                  window.clearTimeout(timeout);
                  reject(signal.reason || abortError());
                },
                { once: true },
              );
            });

          window.fetch = async (input, init) => {
            const normalized =
              input instanceof Request ? input : new URL(String(input), window.location.href);
            const request = new Request(normalized, init);
            const url = new URL(request.url);
            if (!url.pathname.startsWith('/webapi/chat/')) {
              return originalFetch(input, init);
            }

            const plan = await window.__msmCreateChatPlan(
              request.url,
              await request.clone().text(),
            );
            const encoder = new TextEncoder();
            let cancelled = false;
            const body = new ReadableStream({
              cancel() {
                cancelled = true;
              },
              start(controller) {
                void (async () => {
                  try {
                    for (let index = 0; index < plan.chunks.length; index += 1) {
                      if (cancelled) {
                        return;
                      }
                      if (request.signal.aborted) {
                        throw request.signal.reason || abortError();
                      }
                      if (index === plan.chunks.length - 1) {
                        await wait(plan.finalDelayMs, request.signal);
                      }
                      controller.enqueue(encoder.encode(plan.chunks[index]));
                      if (index < plan.chunks.length - 2) {
                        await wait(20, request.signal);
                      }
                    }
                    if (!cancelled) {
                      controller.close();
                    }
                  } catch (error) {
                    if (!cancelled) {
                      controller.error(error);
                    }
                  }
                })();
              },
            });

            return new Response(body, {
              headers: {
                'Cache-Control': 'no-cache',
                'Content-Type': 'text/event-stream',
              },
              status: 200,
            });
          };
          window.__msmChatMockInstalled = true;
        })();
      `,
    });
  }
}
