import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface CapturedProviderRequest {
  body: Record<string, unknown>;
  headers: IncomingMessage['headers'];
  method: string;
  path: string;
}

type ResponseMode = 'failure' | 'rich' | 'success';

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
};

const sendJSON = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

const chatCompletion = {
  choices: [
    {
      finish_reason: 'stop',
      index: 0,
      logprobs: null,
      message: { content: 'MSM provider response', role: 'assistant' },
    },
  ],
  created: 1,
  id: 'chatcmpl_msm',
  model: 'gpt-4o',
  object: 'chat.completion',
  usage: { completion_tokens: 3, prompt_tokens: 2, total_tokens: 5 },
};

const responsesCompletion = {
  created_at: 1,
  error: null,
  id: 'resp_msm',
  incomplete_details: null,
  instructions: null,
  max_output_tokens: null,
  metadata: {},
  model: 'gpt-5',
  object: 'response',
  output: [
    {
      id: 'reasoning_msm',
      summary: [{ text: 'MSM reasoning', type: 'summary_text' }],
      type: 'reasoning',
    },
    {
      content: [
        {
          annotations: [
            {
              end_index: 3,
              start_index: 0,
              title: 'MSM citation',
              type: 'url_citation',
              url: 'https://example.com/msm',
            },
          ],
          text: 'MSM provider response',
          type: 'output_text',
        },
      ],
      id: 'message_msm',
      role: 'assistant',
      status: 'completed',
      type: 'message',
    },
    {
      arguments: '{"query":"msm"}',
      call_id: 'call_msm',
      id: 'function_msm',
      name: 'lookup',
      type: 'function_call',
    },
  ],
  parallel_tool_calls: true,
  status: 'completed',
  temperature: null,
  tool_choice: 'auto',
  tools: [],
  top_p: null,
  usage: {
    input_tokens: 2,
    input_tokens_details: { cached_tokens: 0 },
    output_tokens: 3,
    output_tokens_details: { reasoning_tokens: 1 },
    total_tokens: 5,
  },
};

export class OpenAIStub {
  private mode: ResponseMode = 'success';
  private server?: Server;
  readonly allRequests: CapturedProviderRequest[] = [];
  readonly requests: CapturedProviderRequest[] = [];

  constructor(readonly port = Number(process.env.MSM_OPENAI_STUB_PORT ?? 4010)) {}

  get baseURL() {
    return `http://127.0.0.1:${this.port}/v1`;
  }

  reset(mode: ResponseMode = 'success') {
    this.mode = mode;
    this.requests.length = 0;
  }

  async start() {
    if (this.server) return;

    this.server = createServer(async (request, response) => {
      try {
        const body = await readBody(request);
        const path = new URL(request.url ?? '/', this.baseURL).pathname;
        const captured = {
          body,
          headers: request.headers,
          method: request.method ?? 'GET',
          path,
        };
        this.requests.push(captured);
        this.allRequests.push(captured);

        if (this.mode === 'failure') {
          sendJSON(response, 503, {
            error: { message: 'MSM deterministic upstream failure', type: 'server_error' },
          });
          return;
        }

        if (path.endsWith('/responses')) {
          sendJSON(response, 200, responsesCompletion);
          return;
        }

        if (path.endsWith('/chat/completions') && body.stream === true) {
          response.writeHead(200, {
            'Cache-Control': 'no-cache',
            'Content-Type': 'text/event-stream',
          });
          response.write(
            `data: ${JSON.stringify({
              choices: [
                {
                  delta: { content: 'MSM provider response', role: 'assistant' },
                  finish_reason: null,
                  index: 0,
                },
              ],
              created: 1,
              id: 'chatcmpl_msm',
              model: body.model ?? 'gpt-4o',
              object: 'chat.completion.chunk',
            })}\n\n`,
          );
          response.end('data: [DONE]\n\n');
          return;
        }

        sendJSON(response, 200, this.mode === 'rich' ? responsesCompletion : chatCompletion);
      } catch (error) {
        sendJSON(response, 500, {
          error: {
            message: error instanceof Error ? error.message : String(error),
            type: 'stub_error',
          },
        });
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(this.port, '127.0.0.1', resolve);
    });
  }

  async stop() {
    if (this.server) {
      const server = this.server;
      this.server = undefined;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    const outputDir = path.resolve('test-results');
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      path.join(outputDir, 'provider-requests.json'),
      `${JSON.stringify(this.allRequests, null, 2)}\n`,
    );
  }
}
