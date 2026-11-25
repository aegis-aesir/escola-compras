import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout } from 'node:timers/promises';
import * as runner from '../integrations/openclaw/runner.mjs';

test('heartbeat continues independently without overlapping requests and stops on cleanup', async () => {
  let calls = 0;
  let finish;
  let second;
  const resumed = new Promise(resolve => { second = resolve; });
  const stop = runner.startBridgeHeartbeat({}, {
    intervalMs: 5,
    site: async body => {
      assert.deepEqual(body, { op: 'monitor_heartbeat' });
      if (++calls === 1) await new Promise(resolve => { finish = resolve; });
      else second();
    },
  });
  try {
    await setTimeout(25);
    assert.equal(calls, 1);
    finish();
    await Promise.race([resumed, setTimeout(500).then(() => assert.fail('heartbeat did not resume'))]);
    assert.equal(calls, 2);
  } finally {
    stop();
  }
  await setTimeout(25);
  assert.equal(calls, 2);
});
