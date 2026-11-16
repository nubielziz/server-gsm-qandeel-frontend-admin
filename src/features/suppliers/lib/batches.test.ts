// Tests for the batches of the import dialog: how a list is cut, the order the batches go in, what a failure keeps, and going on
// without sending a batch that went through again.
import { describe, expect, it, vi } from 'vitest';
import { BATCH_SIZE, chunk, createBatchRun, sameItems } from './batches';

const ids = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe('chunk', () => {
  it('cuts a list into batches of 500, keeping the order', () => {
    const batches = chunk(ids(1_132));
    expect(batches.map((batch) => batch.length)).toEqual([500, 500, 132]);
    expect(batches.flat()).toEqual(ids(1_132));
    expect(BATCH_SIZE).toBe(500);
  });

  it('keeps one full batch whole, makes none from nothing, and takes another size', () => {
    expect(chunk(ids(500))).toHaveLength(1);
    expect(chunk(ids(501)).map((batch) => batch.length)).toEqual([500, 1]);
    expect(chunk([])).toEqual([]);
    expect(chunk(ids(5), 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe('sameItems', () => {
  it('is true only for the same items in the same order', () => {
    expect(sameItems([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(sameItems([1, 2, 3], [3, 2, 1])).toBe(false);
    expect(sameItems([1, 2], [1, 2, 3])).toBe(false);
  });
});

describe('a run', () => {
  it('sends the batches one after the other, in order, and answers with one result per batch', async () => {
    const run = createBatchRun<number, number>(ids(1_132));
    const sent: number[][] = [];
    let inFlight = 0;
    let most = 0;
    const answers = await run.run(async (batch) => {
      inFlight += 1;
      most = Math.max(most, inFlight);
      await Promise.resolve();
      sent.push(batch);
      inFlight -= 1;
      return batch.length;
    });
    expect(sent.map((batch) => batch.length)).toEqual([500, 500, 132]);
    expect(sent.flat()).toEqual(ids(1_132));
    expect(most).toBe(1);
    expect(answers).toEqual([500, 500, 132]);
    expect(run.handled).toBe(1_132);
    expect(run.total).toBe(1_132);
  });

  it('tells the progress before each batch: how many are sent or in flight, counting that batch', async () => {
    const run = createBatchRun<number, void>(ids(1_132));
    const progress: number[] = [];
    await run.run(
      async () => undefined,
      (upTo) => progress.push(upTo),
    );
    expect(progress).toEqual([500, 1_000, 1_132]);
  });

  it('stops at the first failure, keeps what went through, and throws the error as it was', async () => {
    const run = createBatchRun<number, number>(ids(1_132));
    const failure = new Error('The supplier is not answering');
    const send = vi
      .fn<(batch: number[]) => Promise<number>>()
      .mockResolvedValueOnce(500)
      .mockRejectedValueOnce(failure);
    await expect(run.run(send)).rejects.toBe(failure);
    expect(send).toHaveBeenCalledTimes(2); // the third batch is not tried
    expect(run.handled).toBe(500);
    expect(run.results).toEqual([500]);
  });

  it('goes on with the batch that failed, and never sends a batch that went through again', async () => {
    const run = createBatchRun<number, number>(ids(1_132));
    const sent: number[][] = [];
    let failOnce = true;
    const send = async (batch: number[]) => {
      if (batch[0] === 501 && failOnce) {
        failOnce = false;
        throw new Error('down');
      }
      sent.push(batch);
      return batch.length;
    };
    await expect(run.run(send)).rejects.toThrow('down');
    expect(sent.map((batch) => batch[0])).toEqual([1]);
    const answers = await run.run(send);
    expect(sent.map((batch) => [batch[0], batch.length])).toEqual([
      [1, 500],
      [501, 500],
      [1_001, 132],
    ]);
    expect(answers).toEqual([500, 500, 132]);
    expect(run.handled).toBe(1_132);
  });

  it('gives a second call made while one is going the same run, not a second send', async () => {
    const run = createBatchRun<number, number>(ids(600));
    const send = vi.fn(async (batch: number[]) => batch.length);
    const [first, second] = await Promise.all([run.run(send), run.run(send)]);
    expect(first).toBe(second);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('has nothing to send for an empty list', async () => {
    const send = vi.fn(async () => 1);
    await expect(createBatchRun<number, number>([]).run(send)).resolves.toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });
});
