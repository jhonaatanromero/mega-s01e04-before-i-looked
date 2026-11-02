import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page', () => {
  it('renders the night with marked rows', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    const rows = [...html.matchAll(/<tr( class="warn")?><td>([^<]+)<\/td><td>([^<]*)<\/td>/g)].map((m) => ({
      job: m[2],
      warn: Boolean(m[1]),
      owner: m[3],
    }));
    expect(rows).toHaveLength(5);
    expect(rows.find((r) => r.job === 'fixtures/refresh')?.warn).toBe(true);
    expect(rows.find((r) => r.job === 'notes/backup')?.warn).toBe(true);
    expect(rows.find((r) => r.job === 'digest/render')?.owner).toBe('—');
  });
});
