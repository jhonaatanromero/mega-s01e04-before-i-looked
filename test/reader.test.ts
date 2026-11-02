import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

const tmp = mkdtempSync(join(tmpdir(), 'rig-reader-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function night(name: string, text: string): string {
  writeFileSync(join(tmp, `${name}.jsonl`), text);
  return name;
}

describe('readNight on runs/2026-10-28.jsonl', () => {
  const result = readNight('runs', '2026-10-28');

  it('yields 5 jobs, sorted, and 1 bad line', () => {
    expect(result).not.toBeNull();
    expect(result?.badLines).toBe(1);
    expect(result?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('aggregates runs, retries, last status, error and times per job', () => {
    const refresh = result?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(refresh).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    const sync = result?.rows.find((r) => r.job === 'lane/sync');
    expect(sync).toMatchObject({ runs: 8, retries: 1, lastStatus: 'ok', lastError: 'lock held' });
    expect(sync?.firstAt).toBe('2026-10-28T23:00:06+01:00');
  });

  it('counts valid lines per status', () => {
    expect(result?.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('keeps a null owner', () => {
    const render = result?.rows.find((r) => r.job === 'digest/render');
    expect(render?.owner).toBeNull();
  });
});

describe('readNight edge cases', () => {
  it('returns null for a missing night', () => {
    expect(readNight(tmp, '2026-01-01')).toBeNull();
  });

  it('gives no rows for an empty file', () => {
    expect(readNight(tmp, night('2026-01-02', ''))).toEqual({
      night: '2026-01-02',
      rows: [],
      counts: { ok: 0, retry: 0, fail: 0 },
      badLines: 0,
    });
  });

  it('counts bad shapes, ignores blank lines, owner from the last line', () => {
    const text = [
      '{"at":"2026-01-03T01:00:00+01:00","job":"a","status":"fail","owner":"x","error":"boom"}',
      '',
      '{"at":"2026-01-03T02:00:00+01:00","job":"a","status":"ok","owner":null}',
      '{"at":"2026-01-03T03:00:00+01:00","job":"a","status":"weird","owner":"x"}',
      '{"at":"2026-01-03T03:00:00+01:00","status":"ok","owner":"x"}',
      '[1,2]',
      'not json',
      '',
    ].join('\n');
    const result = readNight(tmp, night('2026-01-03', text));
    expect(result?.badLines).toBe(4);
    expect(result?.rows).toEqual([
      {
        job: 'a',
        owner: null,
        runs: 2,
        retries: 0,
        lastStatus: 'ok',
        lastError: 'boom',
        firstAt: '2026-01-03T01:00:00+01:00',
        lastAt: '2026-01-03T02:00:00+01:00',
      },
    ]);
  });
});
