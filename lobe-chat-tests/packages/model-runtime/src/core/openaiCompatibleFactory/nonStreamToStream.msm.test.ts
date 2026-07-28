// @vitest-environment node
import type OpenAI from 'openai';
import { describe, expect, it } from 'vitest';

import { transformResponseAPIToStream } from './nonStreamToStream';

const readStreamEvents = async (stream: ReadableStream) => {
  const reader = stream.getReader();
  const events: Array<{ type?: string }> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    events.push(value as { type?: string });
  }

  return events;
};

describe('msm transformResponseAPIToStream', () => {
  it('emits richer Responses lifecycle events including citations and reasoning', async () => {
    const response = {
      id: 'resp_msm',
      output: [
        {
          id: 'rs_1',
          summary: ['thinking hard'],
          type: 'reasoning',
        },
        {
          content: [
            {
              annotations: [
                {
                  end_index: 5,
                  start_index: 0,
                  title: 'Example',
                  type: 'url_citation',
                  url: 'https://example.com',
                },
              ],
              text: 'Hello',
              type: 'output_text',
            },
          ],
          id: 'msg_1',
          role: 'assistant',
          status: 'completed',
          type: 'message',
        },
        {
          arguments: '{"a":1}',
          call_id: 'call_1',
          id: 'fc_1',
          name: 'lookup',
          type: 'function_call',
        },
      ],
      status: 'completed',
      usage: { input_tokens: 1, output_tokens: 2, total_tokens: 3 },
    } as unknown as OpenAI.Responses.Response;

    const events = await readStreamEvents(transformResponseAPIToStream(response));
    const types = events.map((e) => e.type);

    expect(types[0]).toBe('response.created');
    expect(types).toContain('response.output_item.added');
    expect(types).toContain('response.reasoning_summary_part.added');
    expect(types).toContain('response.reasoning_summary_text.delta');
    expect(types).toContain('response.output_text.delta');
    expect(types).toContain('response.output_text.annotation.added');
    expect(types).toContain('response.output_item.done');
    expect(types.at(-1)).toBe('response.completed');

    const reasoningIdx = types.indexOf('response.reasoning_summary_part.added');
    const messageDeltaIdx = types.indexOf('response.output_text.delta');
    const functionDoneIdx = types.lastIndexOf('response.output_item.done');
    expect(reasoningIdx).toBeGreaterThan(0);
    expect(messageDeltaIdx).toBeGreaterThan(reasoningIdx);
    expect(functionDoneIdx).toBeGreaterThan(messageDeltaIdx);
  });
});
