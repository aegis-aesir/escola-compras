const monitorHeartbeatId = 'integration:monitor-heartbeat';
const encoder = new TextEncoder();

export async function recordBridgeHeartbeat(db: D1Database, now: string) {
  await db.prepare(`
    INSERT INTO records (id, kind, data, version) VALUES (?, 'integration_state', ?, 1)
    ON CONFLICT(id) DO UPDATE SET data=excluded.data, version=records.version+1
    WHERE json_extract(records.data, '$.lastSeenAt') < ?
  `).bind(monitorHeartbeatId, JSON.stringify({lastSeenAt: now}), now).run();
}

type MonitorEnv = {
  DB?: D1Database;
  BRIDGE_MONITOR_SECRET?: string;
  INTEGRATION_SECRET?: string;
};

export async function bridgeHealthEndpoint(req: Request, env: MonitorEnv) {
  const response = (body: object, status = 200) =>
    Response.json(body, {status, headers: {'Cache-Control': 'no-store'}});
  if (req.method !== 'GET') return response({error: 'Use GET.'}, 405);

  const secret = env.BRIDGE_MONITOR_SECRET;
  if (!env.DB || !secret || secret.length < 32 || secret === env.INTEGRATION_SECRET) {
    return response({error: 'Monitor indisponível.'}, 503);
  }

  const provided = req.headers.get('Authorization');
  if (!provided?.startsWith('Bearer ') || provided.length > 1024) {
    return response({error: 'Acesso não autorizado.'}, 401);
  }
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['verify'],
  );
  const challenge = encoder.encode('ceea-bridge-monitor');
  const suppliedKey = await crypto.subtle.importKey(
    'raw', encoder.encode(provided.slice(7)), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign'],
  ).catch(() => null);
  if (!suppliedKey || !await crypto.subtle.verify(
    'HMAC', key, await crypto.subtle.sign('HMAC', suppliedKey, challenge), challenge,
  )) return response({error: 'Acesso não autorizado.'}, 401);

  try {
    const heartbeat = await env.DB.prepare(
      "SELECT json_extract(data, '$.lastSeenAt') AS lastSeenAt FROM records WHERE id=? AND kind='integration_state'",
    ).bind(monitorHeartbeatId).first<{lastSeenAt: string}>();
    return response({lastSeenAt: heartbeat?.lastSeenAt ?? null});
  } catch {
    return response({error: 'Monitor indisponível.'}, 503);
  }
}
