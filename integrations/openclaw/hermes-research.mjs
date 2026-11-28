import { execFile } from 'node:child_process';
import { isIPv4 } from 'node:net';

const keyDir = '/home/agente/.ssh/ceea-hermes';
const operations = new Set(['search', 'extract', 'analyze']);

export function hermesResearchConfig(env) {
  const backend = env.ESTRELAS_RESEARCH_BACKEND || 'openclaw';
  if (backend === 'openclaw') return undefined;
  if (backend !== 'hermes') throw new Error('Provedor de pesquisa inválido.');
  if (env.ESTRELAS_BROWSER_RESEARCH === 'true' || env.ESTRELAS_BROWSER_CHECKOUT_FREIGHT === 'true') {
    throw new Error('O navegador autenticado requer a rota OpenClaw.');
  }
  const host = env.ESTRELAS_HERMES_SSH_HOST || '';
  if (!isIPv4(host) || !/^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) {
    throw new Error('Configure um endereço IPv4 privado para o Hermes.');
  }
  return { host };
}

export function callHermesResearch({ host }, request) {
  if (!operations.has(request.op)) throw new Error('Operação Hermes fora do escopo da pesquisa.');
  const input = JSON.stringify(request) + '\n';
  if (Buffer.byteLength(input) > 24000) throw new Error('Entrada excessiva para a pesquisa Hermes.');
  const args = [
    '-T', '-F', '/dev/null', '-p', '22', '-i', keyDir + '/pesquisa-ed25519',
    '-o', 'IdentitiesOnly=yes', '-o', 'IdentityAgent=none', '-o', 'BatchMode=yes',
    '-o', 'StrictHostKeyChecking=yes', '-o', 'HostKeyAlgorithms=ssh-ed25519',
    '-o', 'GlobalKnownHostsFile=/dev/null', '-o', 'UserKnownHostsFile=' + keyDir + '/known_hosts',
    '-o', 'ClearAllForwardings=yes', '-o', 'ConnectTimeout=5',
    'compras-pesquisa@' + host, 'pesquisa-publica',
  ];
  return new Promise((resolve, reject) => {
    const child = execFile('/usr/bin/ssh', args, {
      timeout: request.op === 'analyze' ? 160000 : 45000,
      maxBuffer: 256 * 1024,
      env: { PATH: '/usr/bin:/bin', HOME: '/home/agente' },
    }, (error, stdout) => {
      if (error) return reject(new Error('Operação de pesquisa indisponível no Hermes.'));
      try {
        const response = JSON.parse(stdout);
        if (!response || typeof response !== 'object' || Array.isArray(response)) throw new Error();
        resolve(response);
      } catch {
        reject(new Error('Resposta de pesquisa inválida no Hermes.'));
      }
    });
    child.stdin.on('error', () => reject(new Error('Não foi possível enviar a pesquisa ao Hermes.')));
    child.stdin.end(input);
  });
}

export function hermesTool(body) {
  if (body.tool === 'web_search') return { op: 'search', query: body.args.query, count: body.args.count };
  if (body.tool === 'web_fetch') return { op: 'extract', url: body.args.url };
  throw new Error('Ferramenta indisponível na rota Hermes.');
}

export function hermesAnalysis(job, pages) {
  return {
    op: 'analyze',
    item: job.item,
    ...(job.researchCriteria ? { researchCriteria: job.researchCriteria, researchItem: job.researchItem } : {}),
    ...(job.freightSimulation ? { freightSimulation: job.freightSimulation } : {}),
    pages: pages.map(page => ({ ...page, text: page.text.slice(0, 3500), truncated: page.truncated || page.text.length > 3500 })),
  };
}
