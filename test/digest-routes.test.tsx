import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

type Body = { night: string; rows: { job: string }[]; badLines: number; error?: string };

const line = (job: string, status = 'ok') =>
  JSON.stringify({ at: '2026-10-30T01:00:00+02:00', job, status, owner: 'blas' });

let tmp: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  const write = (night: string, text: string) =>
    writeFileSync(join(tmp, `${night}.jsonl`), text, 'utf8');
  write('2026-01-01', [line('b/job'), line('a/job')].join('\n') + '\n');
  write('2026-01-02', '');
  write('2026-01-03', [line('a/job'), '{not json', line('b/job')].join('\n') + '\n');
  app = createApp({ ...loadConfig(), runsDir: tmp });
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('GET /digest/:night', () => {
  it('returns 200 and the rows for a night with a file', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('a/job');
    expect(html).toContain('b/job');
  });

  it('returns 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-09');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no run log for that night');
  });

  it('renders "nothing ran" for an empty night', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('shows the bad line count and still renders the good rows', async () => {
    const res = await app.request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('1 line did not parse');
    expect(html).toContain('a/job');
    expect(html).toContain('b/job');
  });
});

describe('GET /api/digest/:night', () => {
  it('returns 200 and the rows for a night with a file', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Body;
    expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    expect(body.badLines).toBe(0);
  });

  it('returns 404 with an error field for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-01-09');
    expect(res.status).toBe(404);
    const body = (await res.json()) as Body;
    expect(typeof body.error).toBe('string');
  });

  it('returns empty rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(((await res.json()) as Body).rows).toEqual([]);
  });

  it('counts bad lines and keeps the good rows', async () => {
    const res = await app.request('/api/digest/2026-01-03');
    const body = (await res.json()) as Body;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const night = '2026-01-03';
    const body = (await (await app.request(`/api/digest/${night}`)).json()) as Body;
    const html = await (await app.request(`/digest/${night}`)).text();
    const shown = [...html.matchAll(/<td>([a-z]+\/job)<\/td>/g)].map((m) => m[1]);
    expect(shown).toEqual(body.rows.map((r) => r.job));
  });
});
