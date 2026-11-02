import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { readNight } from '../src/digest/reader.js';

describe('GET /api/digest/:night', () => {
  it('returns the rows in readNight order', async () => {
    const config = loadConfig();
    const app = createApp(config);
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    const expected = readNight('runs', '2026-10-28')!.rows.map((r) => r.job);
    expect(body.rows.map((r) => r.job)).toEqual(expected);
    expect(expected).toEqual(['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs']);
    expect(body.badLines).toBe(1);
  });
});
