import {createHash} from 'node:crypto';

export const RESEARCH_AGENT = 'coordinator';
export const WHATSAPP_AGENT = 'operacional';
const researchJobs = new Set(['estimate_search', 'local_supplier_search', 'national_search']);
const researchTools = new Set(['web_search', 'web_fetch', 'browser']);

/** Sempre escolhe o agente explicitamente; nunca usa a sessão principal implícita do gateway. */
export function routeTool(job, body) {
  const research = researchJobs.has(job.type) && researchTools.has(body.tool);
  const whatsapp = job.type === 'whatsapp_quote' && body.tool === 'message';
  if ((!research && !whatsapp) || typeof job.id !== 'string' || !job.id) throw new Error('Roteamento de tarefa inválido.');
  const agentId = research ? RESEARCH_AGENT : WHATSAPP_AGENT;
  const key = createHash('sha256').update(job.requestId || job.id).digest('hex');
  return {...body, agentId, sessionKey: `agent:${agentId}:compras-${research ? 'pesquisa' : 'whatsapp'}:${key}`};
}
