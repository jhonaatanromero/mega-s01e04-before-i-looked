import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

function count(night: string, status: string): number {
  return readFileSync(`runs/${night}.jsonl`, 'utf8').split('\n').filter((l) => l.includes(`"status":"${status}"`) || l.includes(`"status": "${status}"`)).length;
}

describe('status board links', () => {
  it('links each night to its digest with counts', async () => {
    const html = await (await createApp(config).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('ok 10 · retry 4 · fail 1');
    const c = (s: string) => count('2026-10-27', s);
    expect(c('ok')).toBe(7);
    expect(html).toContain(`ok ${c('ok')} · retry ${c('retry')} · fail ${c('fail')}`);
  });
});
