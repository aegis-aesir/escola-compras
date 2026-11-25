import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';

await build({
  stdin: {
    contents: 'export {bridgeEndpoint} from "./lib/integration-endpoint"; export {bridgeHealthEndpoint} from "./lib/bridge-health";',
    resolveDir: process.cwd(),
  },
  outfile: 'outputs/bridge-heartbeat-test.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
});
const { bridgeEndpoint, bridgeHealthEndpoint } = await import('../outputs/bridge-heartbeat-test.mjs');
const bridgeSecret = 'test-bridge-secret-different-from-monitor';
const monitorSecret = 'test-monitor-secret-different-from-bridge';

test('signed liveness updates are independent of job polling and visible only to the monitor', async () => {
  const mf = new Miniflare({ modules: true, script: 'export default {fetch(){return new Response()}}', d1Databases: ['DB'] });
  try {
    const DB = await mf.getD1Database('DB');
    await DB.exec('CREATE TABLE records (id TEXT PRIMARY KEY, kind TEXT, data TEXT, version INTEGER)');
    const env = { DB, INTEGRATION_SECRET: bridgeSecret, BRIDGE_MONITOR_SECRET: monitorSecret };
    const check = (secret, method = 'GET') => bridgeHealthEndpoint(new Request('https://fixture.invalid', {
      method, headers: secret ? { Authorization: 'Bearer ' + secret } : {},
    }), env);
    assert.equal((await check()).status, 401);
    assert.equal((await check(bridgeSecret)).status, 401);
    assert.equal((await check(monitorSecret, 'POST')).status, 405);
    assert.deepEqual(await (await check(monitorSecret)).json(), { lastSeenAt: null });

    const raw = JSON.stringify({ op: 'monitor_heartbeat' });
    const timestamp = String(Date.now());
    const req = secret => new Request('https://fixture.invalid', {
      method: 'POST', body: raw, headers: {
        'content-type': 'application/json',
        'x-estrelas-timestamp': timestamp,
        'x-estrelas-signature': 'sha256=' + createHmac('sha256', secret).update(timestamp + '.' + raw).digest('hex'),
      },
    });
    assert.equal((await bridgeEndpoint(req(monitorSecret), env)).status, 401);
    assert.deepEqual(await (await bridgeEndpoint(req(bridgeSecret), env)).json(), { ok: true });
    const result = await check(monitorSecret);
    assert.equal(result.headers.get('cache-control'), 'no-store');
    const { lastSeenAt, ...other } = await result.json();
    assert.deepEqual(other, {});
    assert.ok(Date.parse(lastSeenAt) >= Number(timestamp));
    assert.equal((await DB.prepare('SELECT COUNT(*) AS count FROM records').first()).count, 1);
  } finally {
    await mf.dispose();
  }
});
