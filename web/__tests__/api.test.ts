import { describe, expect, test } from 'vitest';

import { parseSSE } from '@/lib/api';

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>) {
  const frames = [];
  for await (const frame of parseSSE(body)) frames.push(frame);
  return frames;
}

describe('parseSSE', () => {
  test('decodes multiple frames in one chunk', async () => {
    const frames = await collect(
      streamOf(
        'event: delta\ndata: {"text":"a"}\n\nevent: done\ndata: {"output_tokens":1}\n\n'
      )
    );

    expect(frames).toEqual([
      { event: 'delta', data: { text: 'a' } },
      { event: 'done', data: { output_tokens: 1 } },
    ]);
  });

  test('reassembles a frame split across chunks', async () => {
    const frames = await collect(
      streamOf('event: del', 'ta\ndata: {"te', 'xt":"hi"}\n', '\n')
    );

    expect(frames).toEqual([{ event: 'delta', data: { text: 'hi' } }]);
  });
});
